import Part from './part'
import Vector from './math/vector'

export default class Bin extends Part {

  constructor(id, width, height, options) {
    let points = [
      new Vector(0, 0),
      new Vector(width, 0),
      new Vector(width, height),
      new Vector(0, height)
    ]

    super(id, points, options)
    this.width = width
    this.height = height
    this.isBin = true
  }

  static fromJSON(json) {
    let bin = new Bin(json.id, json.width, json.height, json.options)
    bin.offset = (json.offset !== undefined) ? new Vector(json.offset.x, json.offset.y) : new Vector(0, 0)
    bin.rotation = json.rotation || 0
    bin.groupId = json.groupId
    return bin
  }

  clone() {
    let bin = new Bin(this.id, this.width, this.height, this.options)
    bin.offset = new Vector(this.offset.x, this.offset.y)
    bin.rotation = this.rotation
    return bin
  }

  toString() {
    // return `bin:${this.id}`
    return `${this.groupId}:${this.transformed}`
  }

}

