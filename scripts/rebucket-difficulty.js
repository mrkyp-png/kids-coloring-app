// 측정된 실제 영역 수를 기준으로 100개 도안을 10단계 x 10개로 재배정하고
// templates.js 파일의 difficulty 필드를 일괄 갱신한다.
const fs = require('fs');
const path = require('path');

const ORDER = [
  'moon', 'heart', 'egg', 'drop', 'leaf', 'envelope', 'soccerball', 'banana', 'peach', 'carrot',
  'cloud', 'donut', 'cherry', 'cookie', 'mushroom', 'bell', 'lollipop', 'candy', 'whale', 'orange',
  'rainbow', 'ladybug', 'kite', 'pear', 'cactus', 'star', 'house', 'bird', 'rocket', 'yacht',
  'snail', 'fish', 'umbrella', 'snowman', 'owl', 'starfish', 'sheep', 'pineapple', 'lemon', 'palmtree',
  'clock', 'pretzel', 'balloon', 'duck', 'car', 'frog', 'penguin', 'train', 'bicycle', 'helicopter',
  'watermelon', 'crab', 'octopus', 'pizzaslice', 'cat', 'tree', 'apple', 'pig', 'mouse', 'bus',
  'truck', 'cupcake', 'crown', 'butterfly', 'dog', 'bear', 'chicken', 'airplane', 'spider', 'castle',
  'peacock', 'caterpillar', 'pumpkin', 'turtle', 'elephant', 'robot', 'xmastree', 'sun', 'boat', 'icecream',
  'rabbit', 'ant', 'guitar', 'wholepizza', 'aquarium', 'zoo', 'beehive', 'lion', 'giftbox', 'farm',
  'flower', 'grapes', 'ferriswheel', 'undersea', 'nightsky', 'garden', 'teddybear', 'space', 'bee', 'strawberry'
];

if (ORDER.length !== 100 || new Set(ORDER).size !== 100) {
  throw new Error('ORDER must have exactly 100 unique ids, got ' + ORDER.length + ' (' + new Set(ORDER).size + ' unique)');
}

const idToLevel = {};
ORDER.forEach((id, i) => { idToLevel[id] = Math.floor(i / 10) + 1; });

const filePath = path.resolve(__dirname, '..', 'templates.js');
let src = fs.readFileSync(filePath, 'utf8');

let changed = 0;
Object.keys(idToLevel).forEach((id) => {
  const level = idToLevel[id];
  const re = new RegExp("(id:\\s*'" + id + "'[\\s\\S]{0,80}?difficulty:\\s*)\\d+", 'm');
  if (!re.test(src)) {
    console.error('NOT FOUND:', id);
    return;
  }
  src = src.replace(re, '$1' + level);
  changed++;
});

fs.writeFileSync(filePath, src, 'utf8');
console.log('Updated difficulty for', changed, 'templates');
