import { authenticate } from '@/lib/auth/authenticate';
import { useAuthUserStore } from '@/lib/auth/auth-user.store';
import { ProductApi } from '../api/products.api';
import { useActiveProductStore } from '../stores/active-product.store';

export async function beforeEnter(to: any) {
  const store = useAuthUserStore();
  const user = await authenticate();

  if (!user) {
    store.user = null;
    return { name: 'signin' };
  } else {
    store.user = user;

    if (to.params.id) {
      const productApi = new ProductApi();
      const activeProductStore = useActiveProductStore();
      productApi
        .findProduct(to.params.id)
        .then((product) => (activeProductStore.product = product));
    }
  }
}
