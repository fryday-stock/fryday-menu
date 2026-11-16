import { useEffect } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { MenuProvider, useMenu } from './data/MenuContext';
import { useRoute, back } from './lib/router';
import { themeById } from './themes';
import { ThemeCtx } from './themes/ThemeContext';
import type { ThemeDef } from './themes/types';
import { Overlay } from './components/Overlay';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Toast } from './components/Toast';
import { CartScreen } from './screens/CartScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { DoneScreen } from './screens/DoneScreen';
import { Chooser } from './screens/Chooser';

function ThemeApp({ theme, sub, param }: { theme: ThemeDef; sub?: string; param?: string }) {
  const { byId } = useMenu();
  const item = sub === 'item' && param ? byId.get(param) : undefined;
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.themeColor);
    document.body.style.background = theme.id === 'c' ? '#050506' : '#e9e6e1';
  }, [theme]);
  const Home = theme.Home;
  const ItemView = theme.Item;
  return (
    <ThemeCtx.Provider value={theme}>
      <div className={`${theme.className} app-frame`}>
        <Home />
        <AnimatePresence>
          {item && (
            <Overlay key={`item-${item.id}`} label={item.name}>
              <ItemView item={item} onClose={() => back(theme.id)} />
            </Overlay>
          )}
          {sub === 'cart' && <Overlay key="cart" label="السلة" from="side"><CartScreen /></Overlay>}
          {sub === 'checkout' && <Overlay key="checkout" label="إكمال الطلب" from="side"><CheckoutScreen /></Overlay>}
          {sub === 'done' && <Overlay key="done" label="تأكيد الطلب"><DoneScreen /></Overlay>}
        </AnimatePresence>
        <ThemeSwitcher current={theme.id} />
        <Toast />
      </div>
    </ThemeCtx.Provider>
  );
}

function Routes() {
  const [first, sub, param] = useRoute();
  const theme = first ? themeById(first) : undefined;
  if (!theme) return <Chooser />;
  return <ThemeApp theme={theme} sub={sub} param={param} />;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f7f4ee]">
      <div className="size-14 animate-pulse rounded-full bg-[#ffc72c]" aria-label="جاري التحميل" />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <MenuProvider fallback={<Splash />}>
        <Routes />
      </MenuProvider>
    </MotionConfig>
  );
}
