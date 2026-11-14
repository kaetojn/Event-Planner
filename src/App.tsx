import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Home } from './features/Home';
import { NewPlan } from './features/NewPlan';
import { PlanView } from './features/PlanView';
import { Profile } from './features/Profile';
import { themeAtom, useRoute } from './lib/store';

export default function App() {
  const route = useRoute();
  const theme = useAtomValue(themeAtom);

  // "Match device" follows the phone's own light or dark setting and changes with it.
  useEffect(() => {
    const dark = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = theme === 'system' ? (dark.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#101311' : '#F7F7F5');
    };
    apply();
    dark.addEventListener('change', apply);
    return () => dark.removeEventListener('change', apply);
  }, [theme]);

  if (route.screen === 'new') return <NewPlan />;
  if (route.screen === 'profile') return <Profile />;
  if (route.screen === 'plan') return <PlanView key={route.id} id={route.id} />;
  return <Home />;
}
