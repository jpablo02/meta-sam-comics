/**
 * Make a batch of test comics on this machine: varied ideas chosen to fail if
 * anything is going to, each with the gem hint the create form requires. They
 * land in the local feed as "Tales test". At most WAVE run at once.
 *
 *   npx tsx --env-file=.env.local scripts/local-test-batch.ts
 */
import { fullIdea, makeComic } from "../src/lib/jobs";
import { comicDir } from "../src/lib/store";

const WAVE = 6;

/** [what it tests, idea, gem hint] */
const CASES: Array<[string, string, string]> = [
  ["english-detailed", "A tall Black firefighter in his fifties with a gray beard and a burn scar on his neck finds a half-burned photo album in the ashes of the house where he grew up.", "a photo that survived the fire"],
  ["english-tiny", "A cat and a secret.", "something the cat keeps hiding"],
  ["spanish-long", "Doña Carmen, una costurera de 80 años en Manizales, guarda desde 1970 una carta de amor escondida en el cajón de su vieja máquina de coser Singer. Su nieta Valentina la encuentra mientras le ayuda a ordenar la casa.", "la carta de amor"],
  ["spanglish", "My abuela hides una llave antigua under la cama, and my primo Diego and I want to know what it opens before she wakes up.", "la llave antigua"],
  ["solo-character", "Un faro en una isla del Caribe y su guardián solitario, que cada noche escribe en un cuaderno que nadie leerá.", "el cuaderno del guardián"],
  ["animals-only", "A clever red fox and a grumpy old owl find a lost brass compass in the forest and argue about where it points.", "the brass compass"],
  ["fantasy", "A young witch inherits a cracked crystal ball from her grandmother, and it shows a door she has never seen.", "the cracked crystal ball"],
  ["robots", "A small repair robot in a junkyard finds a child's crayon drawing folded inside a broken delivery drone.", "the crayon drawing"],
  ["romance", "Two strangers swap umbrellas by mistake at a rainy bus stop in Paris; one of them finds a note tucked inside.", "the note inside the umbrella"],
  ["war", "A museum restorer finds a soldier's letter hidden inside the lining of a World War II helmet.", "the soldier's letter"],
  ["famous-name", "Harry, a retired postman with a round belly and no glasses, delivers one last letter that was lost for forty years.", "the forty-year-old letter"],
  ["big-object", "A lighthouse keeper's diary is found hidden inside the old bell of a shipwreck.", "the keeper's diary"],
];

(async () => {
  const stamp = Date.now().toString(36).slice(-5);
  const results: string[] = [];
  for (let start = 0; start < CASES.length; start += WAVE) {
    const wave = CASES.slice(start, start + WAVE);
    const settled = await Promise.allSettled(
      wave.map(([label, idea, hint], i) => {
        const id = `b2-${stamp}-${String(start + i + 1).padStart(2, "0")}-${label}`;
        const job = { id, author: { id: "tales-test", name: "Tales test" }, createdAt: new Date().toISOString(), idea: fullIdea(idea, hint) };
        console.log(`start ${id}`);
        return makeComic(job, comicDir(id)).then(() => id);
      }),
    );
    for (const [i, r] of settled.entries()) {
      const label = wave[i][0];
      results.push(`${start + i + 1}. ${label}: ${r.status === "fulfilled" ? `done ${r.value}` : `FAILED ${String(r.reason).slice(0, 300)}`}`);
    }
  }
  console.log("\n" + results.join("\n"));
})();
