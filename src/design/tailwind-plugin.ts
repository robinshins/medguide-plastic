import plugin from 'tailwindcss/plugin';
import { toCssVars } from './tokens';

// Projects the token file onto `:root` as CSS custom properties, purely so the
// hand-written `.article-content` rules in globals.css can reference them.
// tokens.ts stays the source of truth; these vars are a generated view of it.
export default plugin(({ addBase }) => {
  addBase({ ':root': toCssVars() });
});
