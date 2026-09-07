import sharp from 'sharp';
import path from 'path';

const brainDir = 'C:\\Users\\lohas\\.gemini\\antigravity-ide\\brain\\49a5f71a-5ab3-4022-82e9-aa2801959cc1';
const assetsDir = 'c:\\livestock-watch-pro-main\\src\\assets';

const crops = [
  // BUFFALO
  {
    src: path.join(brainDir, 'buffalo_throat_swelling_1788771896183.jpg'),
    dest: path.join(assetsDir, 'symptom-buffalo-throat.jpg'),
    extract: { left: 260, top: 350, width: 480, height: 480 },
  },
  {
    src: path.join(brainDir, 'buffalo_throat_swelling_1788771896183.jpg'),
    dest: path.join(assetsDir, 'symptom-buffalo-body.jpg'),
    extract: { left: 140, top: 220, width: 480, height: 480 },
  },
  {
    src: path.join(brainDir, 'buffalo_saliva_fever_1788772113591.jpg'),
    dest: path.join(assetsDir, 'symptom-buffalo-saliva.jpg'),
    extract: { left: 230, top: 470, width: 480, height: 480 },
  },
  {
    src: path.join(brainDir, 'buffalo_saliva_fever_1788772113591.jpg'),
    dest: path.join(assetsDir, 'symptom-buffalo-eyes.jpg'),
    extract: { left: 160, top: 150, width: 550, height: 550 },
  },
  {
    src: path.join(brainDir, 'buffalo_down_barn_1788771975996.jpg'),
    dest: path.join(assetsDir, 'symptom-buffalo-down.jpg'),
    extract: { left: 60, top: 400, width: 560, height: 560 },
  },
  {
    src: path.join(brainDir, 'buffalo_down_barn_1788771975996.jpg'),
    dest: path.join(assetsDir, 'symptom-buffalo-vet.jpg'),
    extract: { left: 470, top: 250, width: 520, height: 520 },
  },

  // SHEEP
  {
    src: path.join(brainDir, 'sheep_mouth_lesions_1788771925601.jpg'),
    dest: path.join(assetsDir, 'symptom-sheep-mouth.jpg'),
    extract: { left: 480, top: 380, width: 380, height: 380 },
  },
  {
    src: path.join(brainDir, 'sheep_mouth_lesions_1788771925601.jpg'),
    dest: path.join(assetsDir, 'symptom-sheep-head.jpg'),
    extract: { left: 280, top: 150, width: 560, height: 560 },
  },
  {
    src: path.join(brainDir, 'sheep_mouth_lesions_1788771925601.jpg'),
    dest: path.join(assetsDir, 'symptom-sheep-flock.jpg'),
    extract: { left: 0, top: 150, width: 480, height: 480 },
  },
  {
    src: path.join(brainDir, 'sheep_limping_foot_1788772145089.jpg'),
    dest: path.join(assetsDir, 'symptom-sheep-limp.jpg'),
    extract: { left: 80, top: 300, width: 580, height: 580 },
  },
  {
    src: path.join(brainDir, 'sheep_limping_foot_1788772145089.jpg'),
    dest: path.join(assetsDir, 'symptom-sheep-hoof.jpg'),
    extract: { left: 400, top: 520, width: 380, height: 380 },
  },
  {
    src: path.join(brainDir, 'sheep_patchy_wool_1788772042948.jpg'),
    dest: path.join(assetsDir, 'symptom-sheep-wool.jpg'),
    extract: { left: 180, top: 300, width: 560, height: 560 },
  },

  // GOAT
  {
    src: path.join(brainDir, 'goat_mouth_sores_1788771949395.jpg'),
    dest: path.join(assetsDir, 'symptom-goat-mouth.jpg'),
    extract: { left: 420, top: 320, width: 280, height: 280 },
  },
  {
    src: path.join(brainDir, 'goat_mouth_sores_1788771949395.jpg'),
    dest: path.join(assetsDir, 'symptom-goat-exam.jpg'),
    extract: { left: 0, top: 350, width: 550, height: 550 },
  },
  {
    src: path.join(brainDir, 'goat_mouth_sores_1788771949395.jpg'),
    dest: path.join(assetsDir, 'symptom-goat-head.jpg'),
    extract: { left: 340, top: 250, width: 460, height: 460 },
  },
  {
    src: path.join(brainDir, 'goat_sick_down_1788772070888.jpg'),
    dest: path.join(assetsDir, 'symptom-goat-down.jpg'),
    extract: { left: 240, top: 360, width: 560, height: 560 },
  },
  {
    src: path.join(brainDir, 'goat_sick_down_1788772070888.jpg'),
    dest: path.join(assetsDir, 'symptom-goat-face.jpg'),
    extract: { left: 420, top: 360, width: 320, height: 320 },
  },

  // PIG
  {
    src: path.join(brainDir, 'pig_skin_rash_1788772001890.jpg'),
    dest: path.join(assetsDir, 'symptom-pig-skin.jpg'),
    extract: { left: 300, top: 360, width: 360, height: 360 },
  },
  {
    src: path.join(brainDir, 'pig_skin_rash_1788772001890.jpg'),
    dest: path.join(assetsDir, 'symptom-pig-body.jpg'),
    extract: { left: 520, top: 220, width: 480, height: 480 },
  },
  {
    src: path.join(brainDir, 'pig_face_barn_1788772200274.jpg'),
    dest: path.join(assetsDir, 'symptom-pig-snout.jpg'),
    extract: { left: 450, top: 450, width: 380, height: 380 },
  },
  {
    src: path.join(brainDir, 'pig_face_barn_1788772200274.jpg'),
    dest: path.join(assetsDir, 'symptom-pig-face.jpg'),
    extract: { left: 220, top: 150, width: 580, height: 580 },
  },
];

async function run() {
  for (const c of crops) {
    try {
      await sharp(c.src)
        .extract(c.extract)
        .resize(500, 500)
        .jpeg({ quality: 90 })
        .toFile(c.dest);
      console.log(`Saved: ${path.basename(c.dest)}`);
    } catch (err) {
      console.error(`Error on ${c.dest}:`, err.message);
    }
  }
}

run();
