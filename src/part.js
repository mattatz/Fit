
import Polygon from './math/polygon'
import Vector from './math/vector'

export default class Part extends Polygon {
  constructor(id, points, options) {
    super(points, options)

    this.id = id
    this.offset = new Vector(0, 0)
    this.transformed = 0
    this.rotation = 0
  }

  static fromJSON(json) {
    let points = json.points.map(p => Vector.fromJSON(p))
    let part = new Part(json.id, points, json.options)
    part.offset = new Vector(json.offset.x, json.offset.y)
    part.transformed = json.transformed
    part.rotation = json.rotation
    return part
  }

  transform(index, range) {
    let cloned = this.clone()
    cloned.transformed = index
    cloned.rotation = (1.0 * index / range) * Math.PI * 2
    return cloned
  }

  clone() {
    let points = this.points.map(p => p.clone())
    let np = new Part(this.id, points, this.options)
    np.offset = this.offset.clone()
    np.transformed = this.transformed
    np.rotation = this.rotation
    return np
  }

  toString() {
    return `${this.id}:${this.transformed}`
  }

}

