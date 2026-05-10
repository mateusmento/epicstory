import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import PhotoSwipe from "photoswipe";
import type { SlideData } from "photoswipe";
import "photoswipe/style.css";
import "./media-attachment-lightbox.css";
import { isImageMime, isVideoMime } from "./attachment-media-guards";

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 1600,
        height: img.naturalHeight || 900,
      });
    img.onerror = () => resolve({ width: 1600, height: 900 });
    img.src = url;
  });
}

/**
 * Thin-stroke toolbar icons (Linear-style): ~18px, light weight.
 * `class="psw-linear-icn"` matches sizing in `media-attachment-lightbox.css`.
 */
const icn = {
  download: `<svg xmlns="http://www.w3.org/2000/svg" class="psw-linear-icn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m8.5 11.5 3.5 3.5 3.5-3.5"/><path d="M5 19h14"/></svg>`,
  copyImage: `<svg xmlns="http://www.w3.org/2000/svg" class="psw-linear-icn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M5.5 15.5h-1a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  link: `<svg xmlns="http://www.w3.org/2000/svg" class="psw-linear-icn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 12a3.5 3.5 0 0 0 5.26 3.05l2.2-2.2a3.5 3.5 0 0 0-4.95-4.95l-.95.95"/><path d="M15 11a3.5 3.5 0 0 0-5.26-3.05l-2.2 2.2a3.5 3.5 0 0 0 4.95 4.95l.95-.95"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" class="psw-linear-icn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>`,
};

type SlideDataWithMeta = SlideData & {
  attachmentUrl: string;
  originalFilename: string;
  isImageSlide?: boolean;
};

async function buildSlides(files: MessageAttachmentDto[]): Promise<SlideDataWithMeta[]> {
  const slides: SlideDataWithMeta[] = [];
  for (const f of files) {
    if (isImageMime(f.mimeType)) {
      const { width, height } = await loadImageDimensions(f.url);
      slides.push({
        src: f.url,
        /** Shown during open/close zoom; required or PhotoSwipe uses an empty div placeholder. */
        msrc: f.url,
        width,
        height,
        alt: f.originalFilename,
        attachmentUrl: f.url,
        originalFilename: f.originalFilename,
        isImageSlide: true,
      });
    } else if (isVideoMime(f.mimeType, f.originalFilename)) {
      const safeUrl = escapeAttr(f.url);
      slides.push({
        html: `<div class="epicstory-psw-video-wrap flex items-center justify-center w-full h-full bg-black"><video src="${safeUrl}" controls playsinline preload="metadata" class="max-h-[85vh] max-w-full">${escapeAttr(f.originalFilename)}</video></div>`,
        width: 1920,
        height: 1080,
        attachmentUrl: f.url,
        originalFilename: f.originalFilename,
        isImageSlide: false,
      });
    }
  }
  return slides;
}

function mediaOnlyIndex(files: MessageAttachmentDto[], clickedFile: MessageAttachmentDto): number {
  const media = files.filter((f) => isImageMime(f.mimeType) || isVideoMime(f.mimeType, f.originalFilename));
  const i = media.findIndex((f) => f.id === clickedFile.id);
  return i < 0 ? 0 : i;
}

async function copyUrl(url: string) {
  await navigator.clipboard.writeText(url);
}

async function copyImageFromUrl(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const type = blob.type.startsWith("image/") ? blob.type : "image/png";
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  a.rel = "noopener";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function registerUi(pswp: InstanceType<typeof PhotoSwipe>) {
  pswp.ui.registerElement({
    name: "zoom-level-indicator",
    className: "epicstory-psw-zoom-pill",
    order: 4,
    onInit: (el, instance) => {
      const update = () => {
        const slide = instance.currSlide;
        if (!slide) return;
        const pct = Math.round(slide.currZoomLevel * 100);
        el.textContent = `${pct}%`;
      };
      update();
      instance.on("zoomPanUpdate", (e: { slide: unknown }) => {
        if (e.slide === instance.currSlide) update();
      });
      instance.on("change", update);
    },
  });

  pswp.ui.registerElement({
    name: "epicstory-download",
    title: "Download",
    ariaLabel: "Download",
    order: 10,
    isButton: true,
    html: icn.download,
    onClick: (_e, _el, instance) => {
      const data = instance.currSlide?.data as SlideDataWithMeta | undefined;
      const url = data?.attachmentUrl ?? data?.src;
      if (url) triggerDownload(url, data?.originalFilename ?? "download");
    },
  });

  pswp.ui.registerElement({
    name: "epicstory-copy-image",
    title: "Copy image",
    ariaLabel: "Copy image",
    order: 12,
    isButton: true,
    html: icn.copyImage,
    onInit: (el, instance) => {
      const sync = () => {
        const data = instance.currSlide?.data as SlideDataWithMeta | undefined;
        const can = !!data?.isImageSlide;
        (el as HTMLButtonElement).disabled = !can;
        el.style.opacity = can ? "1" : "0.35";
      };
      sync();
      instance.on("change", sync);
    },
    onClick: async (_e, _el, instance) => {
      const data = instance.currSlide?.data as SlideDataWithMeta | undefined;
      if (!data?.isImageSlide || !data.attachmentUrl) return;
      try {
        await copyImageFromUrl(data.attachmentUrl);
      } catch {
        /* CORS or clipboard */
      }
    },
  });

  pswp.ui.registerElement({
    name: "epicstory-copy-link",
    title: "Copy link",
    ariaLabel: "Copy link",
    order: 14,
    isButton: true,
    html: icn.link,
    onClick: async (_e, _el, instance) => {
      const data = instance.currSlide?.data as SlideDataWithMeta | undefined;
      const url = data?.attachmentUrl ?? data?.src;
      if (!url) return;
      try {
        await copyUrl(url);
      } catch {
        /* denied */
      }
    },
  });

  pswp.ui.registerElement({
    name: "epicstory-close",
    title: "Close",
    ariaLabel: "Close",
    order: 20,
    isButton: true,
    html: icn.close,
    onClick: (_e, _el, instance) => {
      instance.close();
    },
  });
}

/**
 * Open PhotoSwipe for image/video attachments (carousel across media only).
 * Pass the clicked thumbnail `HTMLElement` so opening uses the zoom-from-thumb transition.
 */
export async function openAttachmentLightbox(
  files: MessageAttachmentDto[],
  clickedFile: MessageAttachmentDto,
  thumbElement?: HTMLElement | null,
): Promise<void> {
  const media = files.filter((f) => isImageMime(f.mimeType) || isVideoMime(f.mimeType, f.originalFilename));
  if (!media.length) return;

  const slides = await buildSlides(media);
  if (!slides.length) return;

  const startIndex = mediaOnlyIndex(files, clickedFile);
  const slide0 = slides[startIndex];
  const imageThumbZoom = !!(thumbElement && document.contains(thumbElement) && slide0?.isImageSlide);

  if (imageThumbZoom && slide0) {
    slide0.element = thumbElement;
    slide0.thumbCropped = true;
  }

  const pswp = new PhotoSwipe({
    dataSource: slides,
    index: startIndex,
    bgOpacity: 1,
    mainClass: "epicstory-attachment-lightbox",
    showHideAnimationType: imageThumbZoom ? "zoom" : "fade",
    /** Thumbnail may be `<img>` or `<video>` on the tile. */
    thumbSelector: "img, video",
    zoom: false,
    close: false,
    arrowPrev: false,
    arrowNext: false,
    counter: false,
    imageClickAction: "zoom",
    tapAction: false,
    escKey: true,
    loop: true,
    padding: { top: 56, bottom: 40, left: 16, right: 16 },
  });

  pswp.on("uiRegister", () => {
    registerUi(pswp);
  });

  pswp.init();
}
