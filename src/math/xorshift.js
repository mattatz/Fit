const r = Symbol()

export default class XorShift {

  constructor(w = 0, x = 123456789, y = 362436069, z = 521288629) {
    this.w = w + 1
    this.x = 0 | this.w << 13
    this.y = 0 | (this.w >>> 9) ^ (this.x << 6)
    this.z = 0 | this.y >>> 7
  }

  next() {
    let t = this.x ^ (this.x << 11)
    this.x = this.y
    this.y = this.z
    this.z = this.w
    return (this.w = ((this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8)))) >>> 0
  }

  rand() {
    return this.next()
  }

  randInt(min = 0, max = 0x7FFFFFFF) {
    const r = Math.abs(this.rand())
    return r % (max - min) + min
  }

  randFloat(min = 0, max = 1) {
    return Math.fround(this.rand() % 0xFFFF / 0xFFFF) * (max - min) + min
  }

  shuffle(_arr) {
    var arr = _arr.concat();
    for (let i = 0; i <= arr.length - 2; i = 0 | i + 1) {
      let r = this.randInt(i, arr.length - 1)
      let tmp = arr[i]
      arr[i] = arr[r]
      arr[r] = tmp
    }
    return arr
  }
}
