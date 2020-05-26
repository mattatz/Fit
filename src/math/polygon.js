import Svg from './svg'
import Vector from './vector'
import BoundingBox from './bounding_box'

export default class Polygon extends Svg {

  constructor(points, options = {}) {
    super()

    this.points = points
    this.options = options
    this.groupId = ''
  }

  static fromJSON(json) {
    let points = json.points.map(p => Vector.fromJSON(p))
    let poly = new Polygon(points, json.options)
    poly.groupId = json.groupId
    return poly
  }

  bounds() {
    let minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE
    let minY = Number.MAX_VALUE, maxY = Number.MIN_VALUE

    this.points.forEach(p => {
      minX = Math.min(p.x, minX)
      minY = Math.min(p.y, minY)
      maxX = Math.max(p.x, maxX)
      maxY = Math.max(p.y, maxY)
    })

    return new BoundingBox(new Vector(minX, minY), new Vector(maxX, maxY))
  }

  translate(dx, dy) {
    let np = this.clone()
    np.points = np.points.map(p => {
      return p.translate(dx, dy)
    })
    return np
  }

  rotate(angle = 0) {
    let np = this.clone()
    let sin = Math.sin(angle)
    let cos = Math.cos(angle)
    np.points = np.points.map(p => {
      return new Vector(p.x * cos - p.y * sin, p.x * sin + p.y * cos, p.marked)
    })
    return np
  }

  clone() {
    let points = this.points.map(p => p.clone())
    let np = new Polygon(points, this.options)
    np.groupId = this.groupId
    return np
  }

  area() {
    let area = 0;
    let n = this.points.length
    for (let i = 0, j = n - 1; i < n; j = i++) {
      area += (this.points[j].x + this.points[i].x) * (this.points[j].y - this.points[i].y)
    }
    return 0.5 * area
  }

  toTextSVG() {
    let g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.points.forEach((v, i) => {
      let text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttributeNS(null, 'x', v.x)
      text.setAttributeNS(null, 'y', v.y)
      text.setAttributeNS(null, 'font-size', '16')
      let textNode = document.createTextNode(i)
      text.appendChild(textNode)
      g.appendChild(text)
    })
    return g
  }

  toSVG() {
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    let polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    polyline.setAttribute('stroke', this.options.strokeColor || '#000000')
    polyline.setAttribute('stroke-width', this.options.strokeWidth || 2)
    polyline.setAttribute('fill', this.options.fill || 'none')
    this.points.forEach((v, i) => {
      let point = svg.createSVGPoint()
      point.x = v.x
      point.y = v.y
      polyline.points.appendItem(point)
    })

    if ((this.options.closed === undefined || this.options.closed) && this.points.length > 0) {
      let v = this.points[0]
      let point = svg.createSVGPoint()
      point.x = v.x
      point.y = v.y
      polyline.points.appendItem(point)
    }

    return polyline
  }

  approximately(other) {
    let n = this.points.length
    let m = other.points.length
    if (n !== m) return false

    for (let i = 0; i < n; i++) {
      let p0 = this.points[i]
      let p1 = other.points[i]
      if (!p0.approximately(p1)) {
        return false
      }
    }

    return true
  }

}
