<script setup lang="ts">
const currentWorkspace = "Epicstory";
</script>

<template>
  <div class="flex:cols absolute inset-0 bg-zinc-100">
    <!-- Navigation sidebar -->
    <aside class="flex:rows-xl p-2 w-64 text-xs text-neutral-700">
      <div class="flex:cols-auto flex:center-y">
        <div
          class="flex:cols-4xl flex:center-y p-2 pr-4 w-fit rounded-md hover:bg-zinc-200/60 cursor-pointer"
        >
          <div class="flex:rows-sm">
            <div class="text-xs text-zinc-500">Workspace</div>
            <div class="text-lg text-neutral-800">{{ currentWorkspace }}</div>
          </div>

          <svg
            width="13"
            height="9"
            viewBox="0 0 13 9"
            fill="currentcolor"
            class="sc-dMvfzH sc-jyqPPl ccOnMv ijJMxD"
          >
            <path
              d="M10.1611 0.314094L5.99463 4.48054L1.82819 0.314094C1.4094 -0.104698 0.732886 -0.104698 0.314094 0.314094C-0.104698 0.732886 -0.104698 1.4094 0.314094 1.82819L5.24295 6.75705C5.66175 7.17584 6.33825 7.17584 6.75705 6.75705L11.6859 1.82819C12.1047 1.4094 12.1047 0.732886 11.6859 0.314094C11.2671 -0.0939598 10.5799 -0.104698 10.1611 0.314094Z"
              transform="translate(0.77832 0.998535)"
            ></path>
          </svg>
        </div>

        <div class="flex flex:center mx-2 p-4 rounded-md hover:bg-zinc-200/60 cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M11.824 6.024L9.848 8L11.824 9.976C11.903 10.0493 11.9607 10.1426 11.9911 10.246C12.0215 10.3494 12.0235 10.4591 11.9968 10.5635C11.9701 10.6679 11.9157 10.7632 11.8394 10.8393C11.7631 10.9155 11.6677 10.9696 11.5632 10.996C11.4589 11.0227 11.3493 11.0209 11.246 10.9906C11.1427 10.9603 11.0494 10.9028 10.976 10.824L8.576 8.424C8.46364 8.3115 8.40053 8.159 8.40053 8C8.40053 7.841 8.46364 7.6885 8.576 7.576L10.976 5.176C11.0898 5.07007 11.2403 5.01239 11.3957 5.01508C11.5512 5.01776 11.6995 5.08061 11.8096 5.1904C11.9194 5.30048 11.9822 5.44884 11.9849 5.6043C11.9876 5.75975 11.9299 5.91019 11.824 6.024Z"
              fill="#ACACB6"
            />
            <path
              d="M14.6 16L1.4 16C0.6272 16 0 15.3728 0 14.6L0 1.4C0 1.0287 0.1475 0.672602 0.41005 0.41005C0.672602 0.1475 1.0287 0 1.4 0L14.6 0C14.9713 0 15.3274 0.1475 15.5899 0.41005C15.8525 0.672602 16 1.0287 16 1.4L16 14.6C16 15.3728 15.3728 16 14.6 16ZM14.8 14.6L14.8 1.4C14.8 1.2896 14.7104 1.2 14.6 1.2L5.6 1.2L5.6 14.8L14.6 14.8C14.653 14.8 14.7039 14.7789 14.7414 14.7414C14.7789 14.7039 14.8 14.653 14.8 14.6ZM4.4 1.2H1.4C1.34696 1.2 1.29609 1.22107 1.25858 1.25858C1.22107 1.29609 1.2 1.34696 1.2 1.4L1.2 14.6C1.2 14.653 1.22107 14.7039 1.25858 14.7414C1.29609 14.7789 1.34696 14.8 1.4 14.8H4.4L4.4 1.2Z"
              fill="#ACACB6"
            />
          </svg>
        </div>
      </div>
      <nav class="flex:rows-xl font-semibold">
        <div class="px-2 py-1 rounded-sm text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">Projects</div>
        <div class="px-2 py-1 rounded-sm text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">Channels</div>
      </nav>
    </aside>
    <main
      class="self:fill bg-white mt-2 rounded-tl-md border border-zinc-300/60 shadow-md shadow-zinc-300/60"
    >
      <!-- Application sidebar -->
      <aside class="w-96 h-full border-r border-r-zinc-300/60"></aside>
    </main>
  </div>
</template>

<style lang="scss" scoped></style>
