import random from 'math-random';

export default function createUserId() {
  return `dl_${ random().toString(36).substr(2, 10) }`;
}
