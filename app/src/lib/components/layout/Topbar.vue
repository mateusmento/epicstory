<script setup lang="ts">
import { useAuthUserStore } from '@/lib/auth/auth-user.store';
import { AuthApi } from '@/lib/api/auth.api';
import { vOnClickOutside } from '@vueuse/components';
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import ColorfulBar from './ColorfulBar.vue';
import SearchBar from './SearchBar.vue';
import { useActiveProductStore } from '@/lib/stores/active-product.store';
import { envs } from '@/lib/utils/envs';

const router = useRouter();
const route = useRoute();

const authUserStore = useAuthUserStore();
const activeProductStore = useActiveProductStore();

const id = computed(() => route.params.id);
const productId = computed(() => (route.path.startsWith('/products') ? +route.params.id : null));

const showDropdown = ref(false);

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

function hideDropdown() {
  showDropdown.value = false;
}

const authApi = new AuthApi();

async function signout() {
  await authApi.signout();
  authUserStore.user = null;
  router.push('/auth/signin');
}
</script>

<template>
  <header>
    <div class="topbar-header">
      <router-link to="/products">
        <button class="active-product" pill>{{ activeProductStore.product?.name }}</button>
      </router-link>

      <SearchBar v-if="productId" :productId="productId" />

      <div class="right-side">
        <div class="dropdown" :class="{ active: showDropdown }" v-on-click-outside="hideDropdown">
          <div class="dropdown-toggle" @click="toggleDropdown">
            <img
              class="user-photo"
              :src="`${envs.API_BASE_URL}/users/${authUserStore.user?.id}/photo`"
            />
          </div>
          <ul class="dropdown-menu menu list">
            <li>Welcome, {{ authUserStore.user?.name }}</li>
            <li class="menu-item">
              <RouterLink to="" @click="toggleDropdown" @click.prevent="signout">
                Sign Out
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- <ColorfulBar /> -->
  </header>
</template>

<style scoped>
.topbar-header {
  display: flex;
  /* justify-content: space-between; */
  align-items: center;
  gap: 40px;
  padding: 15px 30px;
  /* background-color: #fff; */
}

nav {
  display: flex;
  gap: 30px;
}

.search-bar {
  width: 360px;
  margin-right: auto;
}

.active-product {
  background-color: transparent;
  border: 1px solid #7559f0;
  color: #7559f0;
  font-weight: 600;
}

.right-side {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* min-width: 200px; */
}

.user-photo {
  width: 30px;
}
</style>

<style lang="sass" scoped>
.dropdown-menu
  right: 0
  margin-top: 10px
</style>
