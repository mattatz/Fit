
import { noFitRectanglePolygon, noFitPolygon, minkowskiDifference } from '../util'
import Part from '../part'

self.addEventListener('message', (e) => {
  let pa = Part.fromJSON(e.data.A)
  pa = pa.rotate(pa.rotation)

  let pb = Part.fromJSON(e.data.B)
  pb = pb.rotate(pb.rotation)

  let debug = e.data.debug || false

  let result
  if (e.data.A.isBin) {
    let polygon = noFitRectanglePolygon(pa, pb, e.data.inside, e.data.edges)
    if (polygon) {
      result = [polygon]
    } else {
      result = []
    }
  } else {
    if(e.data.edges) {
      result = noFitPolygon(pa, pb, e.data.inside, e.data.edges, debug)
    } else {
      result = minkowskiDifference(pa, pb)
    }
  }

  result = result.map(polygon => {
    if (polygon.area() > 0) {
      polygon.points.reverse()
    }
    return polygon
  })
  self.postMessage({ result: result })
})
