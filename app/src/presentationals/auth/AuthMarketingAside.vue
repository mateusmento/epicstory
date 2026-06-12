<template>
  <aside class="auth-aside signup-advertisement highlight-box flex:col-auto w-md rounded-xl">
    <div class="m-4xl">
      <b class="block logo-title font-semibold mb-4xl">Epicstory</b>

      <div class="flex:col-3xl">
        <slot name="headline" />
        <slot name="subtitle" />
      </div>
    </div>

    <div class="flex-1"></div>
    <div class="flex-1"></div>

    <article class="testimony m-2xl">
      <div class="testimony-backdrop"></div>
      <div class="testimony-content">
        <p>
          It's simply wonderful to still be aligned with Scrum values when communicating remotely. Epicstory
          helped our teams to best perform when fast communication is required.
        </p>

        <figure>
          <figcaption></figcaption>
        </figure>

        <dl>
          <dt>Mateus Sarmento</dt>
          <dd>Co-founder of Epicstory</dd>
        </dl>
      </div>
    </article>
  </aside>
</template>

<style lang="scss" scoped>
.logo-title {
  font-size: 1.6em;
}

:deep(.headline_title) {
  font-size: 2.8em;
}

:deep(.headline_subtitle) {
  font-size: 1.2em;
}

.testimony {
  position: relative;
}

.testimony .testimony-content {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 20px;
  padding: 20px;
  border-radius: 10px;
  background-color: var(--dark-blue);
  font-family: "Lato";

  p {
    grid-column: span 2;
    font-size: 1rem;
  }

  img {
    width: 42px;
    border-radius: 10px;
  }
}
</style>
