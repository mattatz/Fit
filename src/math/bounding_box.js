
export default class BoundingBox { 

  constructor(min, max) {
    this.min = min
    this.max = max
    this.width = this.max.x - this.min.x
    this.height = this.max.y - this.min.y
  }

}