import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.cas-per.it",
  build: {
    // A new asset directory prevents mobile webviews from reusing pre-fix CSS.
    assets: "_astro-casper-v2",
  },
});
