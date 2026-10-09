// The example app's entry, and the smallest one a proc app can have: point the
// framework at this directory and let discovery do the rest.
import { resolve } from "node:path";
import { boot } from "../../src/$main";

await boot({ root: resolve(import.meta.dir, "..") });
