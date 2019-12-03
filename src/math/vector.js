
export default class Vector {

  constructor(x = 0, y = 0, marked = false) {
    this.x = x
    this.y = y
    this.marked = marked
  }

  static fromJSON(json) {
    return new Vector(json.x, json.y, json.marked)
  }

  set(v) {
    this.x = v.x
    this.y = v.y
    return this
  }

  normalize() {
    let nl = this.length()
    return new Vector(this.x / nl, this.y / nl)
  }

  add(v) {
    return new Vector(this.x + v.x, this.y + v.y)
  }

  sub(v) {
    return new Vector(this.x - v.x, this.y - v.y)
  }

  multiplyScalar(scalar) {
    return new Vector(this.x * scalar, this.y * scalar, this.marked)
  }

  squaredLength() {
    let dx = this.x * this.x
    let dy = this.y * this.y
    return dx + dy
  }

  length() {
    return Math.sqrt(this.squaredLength())
  }

  dot(v) {
    return this.x * v.x + this.y * v.y
  }

  cross(v) {
    return this.y * v.x - this.x * v.y
  }

  perpendicular() {
    return new Vector(this.y, - this.x)
  }

  negative() {
    return new Vector(- this.x, - this.y)
  }

  translate(dx, dy) {
    return new Vector(this.x + dx, this.y + dy)
  }

  mark() {
    this.marked = true
    return this
  }

  unmark() {
    this.marked = false
    return this
  }

  approximately(v, tolerance = 1e-9) {
    return (Math.abs(this.x, v.x) < tolerance) && (Math.abs(this.y, v.y) < tolerance)
  }

  clone() {
    return new Vector(this.x, this.y, this.marked)
  }

}