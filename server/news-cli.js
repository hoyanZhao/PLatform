import { syncNews } from "./news.js";
console.log(JSON.stringify(await syncNews(), null, 2));
