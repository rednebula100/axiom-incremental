// Decimal is a global set by break_infinity before any module evaluates.
// Note: break_infinity's .log10() returns a plain JS number, not a Decimal.

import { gameState } from './state.js';

const SUFFIXES = [
  '',     // 10^0    (raw, < 1K)
  'K',    // 10^3
  'M',    // 10^6
  'B',    // 10^9
  'T',    // 10^12
  'Qa',   // 10^15
  'Qi',   // 10^18
  'Sx',   // 10^21
  'Sp',   // 10^24
  'Oc',   // 10^27
  'No',   // 10^30
  'Dc',   // 10^33
  'Ud',   // 10^36
  'Dd',   // 10^39
  'Td',   // 10^42
  'Qad',  // 10^45
  'Qid',  // 10^48
  'Sxd',  // 10^51
  'Spd',  // 10^54
  'Ocd',  // 10^57
  'Nod',  // 10^60
  'Vg',   // 10^63
  'Uvg',  // 10^66
  'Dvg',  // 10^69
  'Tvg',  // 10^72
  'Qavg', // 10^75
  'Qivg', // 10^78
  'Sxvg', // 10^81
  'Spvg', // 10^84
  'Ocvg', // 10^87
  'Novg', // 10^90
  'Tg',   // 10^93
  'Utg',  // 10^96
  'Dtg',  // 10^99
  'Ttg',  // 10^102
  'Qatg', // 10^105
  'Qitg', // 10^108
  'Sxtg', // 10^111
  'Sptg', // 10^114
  'Octg', // 10^117
  'Notg', // 10^120
  'Qag',  // 10^123
  'Uqag', // 10^126
  'Dqag', // 10^129
  'Tqag', // 10^132
  'Qaqg', // 10^135
  'Qiqg', // 10^138
  'Sxqg', // 10^141
  'Spqg', // 10^144
  'Ocqg', // 10^147
  'Noqg', // 10^150
  'Qig',  // 10^153
  'Uqig', // 10^156
  'Dqig', // 10^159
  'Tqig', // 10^162
  'Qaqig',// 10^165
  'Qiqig',// 10^168
  'Sxqig',// 10^171
  'Spqig',// 10^174
  'Ocqig',// 10^177
  'Noqig',// 10^180
  'Sxg',  // 10^183
  'Usxg', // 10^186
  'Dsxg', // 10^189
  'Tsxg', // 10^192
  'Qasxg',// 10^195
  'Qisxg',// 10^198
  'Sxsxg',// 10^201
  'Spsxg',// 10^204
  'Ocsxg',// 10^207
  'Nosxg',// 10^210
  'Spg',  // 10^213
  'Uspg', // 10^216
  'Dspg', // 10^219
  'Tspg', // 10^222
  'Qaspg',// 10^225
  'Qispg',// 10^228
  'Sxspg',// 10^231
  'Spspg',// 10^234
  'Ocspg',// 10^237
  'Nospg',// 10^240
  'Ocg',  // 10^243
  'Uocg', // 10^246
  'Docg', // 10^249
  'Tocg', // 10^252
  'Qaocg',// 10^255
  'Qiocg',// 10^258
  'Sxocg',// 10^261
  'Spocg',// 10^264
  'Ococg',// 10^267
  'Noocg',// 10^270
  'Nog',  // 10^273
  'Unog', // 10^276
  'Dnog', // 10^279
  'Tnog', // 10^282
  'Qanog',// 10^285
  'Qinog',// 10^288
  'Sxnog',// 10^291
  'Spnog',// 10^294
  'Ocnog',// 10^297
  'Nonog',// 10^300
  'Ce',   // 10^303
];

export function fmt(val) {
  if (!(val instanceof Decimal)) val = new Decimal(val);

  if (gameState.scientificNotation) return val.toExponential(3);

  // Below 1,000: plain decimal
  if (val.lt(new Decimal(1000))) return val.toFixed(3);

  // log10() on a break_infinity Decimal returns a plain JS number
  const tier = Math.floor(val.log10() / 3);

  // Beyond Ce (10^303): fall back to scientific notation
  if (tier >= SUFFIXES.length) return val.toExponential(3);

  const scaled = val.div(new Decimal(10).pow(tier * 3));
  return scaled.toFixed(3) + SUFFIXES[tier];
}

export function fmtRate(val) {
  if (!(val instanceof Decimal)) val = new Decimal(val);
  return '+' + fmt(val) + ' / s';
}
