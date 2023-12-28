<script setup lang="ts">
import Button from '@/components/Button.vue';
import Field from '@/components/Field.vue';
import Form from '@/components/Form.vue';
</script>

<template>
  <main class="flex flex:center py-xl">
    <div class="signup h-screen w-xl rounded-lg flex:cols-md p-md">
      <aside class="highlight-box flex:rows-auto w-md p-xl rounded-md">
        <b class="logo-title mb-xl">Epicstory</b>

        <div class="flex:rows-md">
          <h1 class="headline_title">Create epic<br> stories with us.</h1>
          <p class="headline_subtitle">Discover a better communication<br> tool for Scrum teams.</p>
        </div>

        <div class="flex:space"></div>
        <div class="flex:space"></div>

        <article class="testimony">
          <p>It's simply wonderful to still be aligned with Scrum values when communicating remotely. Epicstory helped our teams to best perform when fast communication is required.</p>

          <figure>
            <figcaption></figcaption>
            <img src="https://media.licdn.com/dms/image/C4D03AQFdHIdfUdeyTQ/profile-displayphoto-shrink_800_800/0/1605708160283?e=1709164800&v=beta&t=62Kg-gat3PqZ6AtuaUq1NMR4KLOXiWYc5V05HtjhNKw"/>
          </figure>

          <dl>
            <dt>Mateus Sarmento</dt>
            <dd>Co-founder of Epicstory</dd>
          </dl>
        </article>
      </aside>

      <section class="flex:rows-3xl flex:center-y flex:fill mx-2xl">
        <div class="flex:rows-sm">
          <h2 class="title">Sign up</h2>
          <div class="subtitle">Start your journey with Epicstory.</div>
        </div>

        <Form class="flex:rows-md">
          <Field class="flex:rows-sm" label="Your name" name="name"/>
          <Field class="flex:rows-sm" label="Email" name="email"/>
          <Field class="flex:rows-sm" type="password" label="Password" name="password"/>
          <div class="flex:cols-md mt-md ml-auto">
            <Button type="submit" class="btn--primary p-sm">Create account</Button>
          </div>
        </Form>
      </section>
    </div>
  </main>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

main {
  background-color: #e3e8f8;
}

.signup {
  background-color: #fff;
}

.logo-title {
  font-size: 1.6em;
}

.headline_title {
  font-size: 2.8em;
}

.headline_subtitle {
  font-size: 1.2em;
}

.testimony {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 20px;

  background-color: #{$dark-blue};
  padding: 20px;
  border-radius: 10px;
  font-family: 'Manrope';

  p {
    grid-column: span 2;
    font-size: .9rem;
  }

  img {
    width: 42px;
    border-radius: 10px;
  }
}
</style>
