import { useEffect } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { MenuProvider, useMenu } from './data/MenuContext';
import { useRoute, back, go } from './lib/router';
import { theme } from './themes';
import { ThemeCtx } from './themes/ThemeContext';
import { Overlay } from './components/Overlay';
import { Toast } from './components/Toast';
import { CartScreen } from './screens/CartScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { DoneScreen } from './screens/DoneScreen';
import { useDemo } from './hooks/useOpen';

const LEGACY = new Set(['a', 'b', 'c', 'd']);

function Shell() {
  const route = useRoute();
  const { byId } = useMenu();
  // روابط المرحلة 0 القديمة (#/a/...) → نفس الصفحة بدون الحرف
  const legacy = LEGACY.has(route[0]);
  const [sub, param] = legacy ? route.slice(1) : route;
  useEffect(() => {
    if (legacy) go(route.slice(1).join('/'), { replace: true });
  }, [legacy, route]);
  // وضع تجربة (للتجربة برا الدوام): #/?test=open  — والإلغاء: #/?test=off
  useEffect(() => {
    const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    if (q.get('test') === 'open') useDemo.getState().set(true);
    if (q.get('test') === 'off') useDemo.getState().set(false);
  }, []);

  const item = sub === 'item' && param ? byId.get(param) : undefined;
  const Home = theme.Home;
  const ItemView = theme.Item;
  return (
    <ThemeCtx.Provider value={theme}>
      <div className={`${theme.className} app-frame`}>
        <Home />
        <AnimatePresence>
          {item && (
            <Overlay key={`item-${item.id}`} label={item.name}>
              <ItemView item={item} onClose={() => back('')} />
            </Overlay>
          )}
          {sub === 'cart' && <Overlay key="cart" label="السلة" from="side"><CartScreen /></Overlay>}
          {sub === 'checkout' && <Overlay key="checkout" label="إكمال الطلب" from="side"><CheckoutScreen /></Overlay>}
          {sub === 'done' && <Overlay key="done" label="تأكيد الطلب"><DoneScreen /></Overlay>}
        </AnimatePresence>
        <Toast />
      </div>
    </ThemeCtx.Provider>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0e0a07]">
      <img src={`${import.meta.env.BASE_URL}brand/logo-sm.webp`} alt="فرايدي" className="size-24 animate-pulse object-contain" />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <MenuProvider fallback={<Splash />}>
        <Shell />
      </MenuProvider>
    </MotionConfig>
  );
}
