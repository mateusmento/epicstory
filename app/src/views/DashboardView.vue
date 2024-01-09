<script lang="ts" setup></script>

<template>
  <main>
    <div class="div1"></div>
    <div class="div2 p-md">
      <div class="card">
        <div class="card-header">
          <div class="circle"></div>
          <div class=""></div>
        </div>
        <div class="card-content"></div>
      </div>
    </div>
    <div class="div3"></div>
    <div class="flex:rows-md flex:center-x p-md">
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="flex:space"></div>
      <div class="circle"></div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

main {
  display: grid;
  grid-template-columns: 1fr 1.6fr 3.2fr auto;
  width: 100vw;
  height: 100vh;
}

.div1,
.div2,
.div3 {
  border-right: 1px solid $grey-blue;
}

.circle {
  background-color: #aaa;
  border-radius: 100%;
  width: 40px;
  height: 40px;
}

.flex\:space {
  flex: 1;
}

.card {
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 10px;
}
</style>
