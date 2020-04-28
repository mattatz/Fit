
import ClipperLib from 'clipper-lib'
import Vector from './math/vector'
import IndexedVector from './math/indexed_vector'
import Polygon from './math/polygon'
import BoundingBox from './math/bounding_box'

const TOL = 1e-9

const clipperScale = 1e7
const clipperThreshold = 0.0001 * clipperScale

const toClipperCoordinates = function(points) {
  let result = points.map(p => {
    return {
      X: p.x * clipperScale,
      Y: p.y * clipperScale
    }
  })
  return result
}

const toNestCoordinates = function(path) {
  return path.map(p => {
    return new Vector(p.X / clipperScale, p.Y / clipperScale)
  })
}

const approximately = function (a, b, tolerance) {
  if (!tolerance) {
    tolerance = TOL
  }
  return (Math.abs(a - b) < tolerance)
}

const bounds = function(points) {
  let minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE
  let minY = Number.MAX_VALUE, maxY = Number.MIN_VALUE

  points.forEach(p => {
    minX = Math.min(p.x, minX)
    minY = Math.min(p.y, minY)
    maxX = Math.max(p.x, maxX)
    maxY = Math.max(p.y, maxY)
  })

  return new BoundingBox(
    new Vector(minX, minY),
    new Vector(maxX, maxY)
  )
}

// returns true if p lies on the line segment defined by AB, but not at any endpoints
// may need work!
const onSegment = function (A, B, p) {

  // vertical line
  if (approximately(A.x, B.x) && approximately(p.x, A.x)) {
    if (!approximately(p.y, B.y) && !approximately(p.y, A.y) && p.y < Math.max(B.y, A.y) && p.y > Math.min(B.y, A.y)) {
      return true
    }
    else {
      return false
    }
  }

  // horizontal line
  if (approximately(A.y, B.y) && approximately(p.y, A.y)) {
    if (!approximately(p.x, B.x) && !approximately(p.x, A.x) && p.x < Math.max(B.x, A.x) && p.x > Math.min(B.x, A.x)) {
      return true
    }
    else {
      return false
    }
  }

  // range check
  if ((p.x < A.x && p.x < B.x) || (p.x > A.x && p.x > B.x) || (p.y < A.y && p.y < B.y) || (p.y > A.y && p.y > B.y)) {
    return false
  }

  // exclude end points
  if ((approximately(p.x, A.x) && approximately(p.y, A.y)) || (approximately(p.x, B.x) && approximately(p.y, B.y))) {
    return false;
  }

  const cross = (p.y - A.y) * (B.x - A.x) - (p.x - A.x) * (B.y - A.y)

  if (Math.abs(cross) > TOL) {
    return false
  }

  const dot = (p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y)

  if (dot < 0 || approximately(dot, 0)) {
    return false
  }

  const len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y)

  if (dot > len2 || approximately(dot, len2)) {
    return false
  }

  return true
}

const pointInPolygon = function (point, polygon) {
  if (!polygon || polygon.points.length < 3) {
    return null
  }

  let inside = false

  for (let n = polygon.points.length, i = 0, j = n - 1; i < n; j = i++) {
    let pi = polygon.points[i].add(polygon.offset)
    let pj = polygon.points[j].add(polygon.offset)

    if(pi.approximately(point)) {
      return null // no result
    }

    if (onSegment(pi, pj, point)) {
      return null // exactly on the segment
    }

    if (pi.approximately(pj)) {
      // ignore very small lines
      continue
    }

    let intersected = ((pi.y > point.y) != (pj.y > point.y)) && (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)
    if (intersected) {
      inside = !inside
    }
  }

  return inside
}

const pointDistance = function (p, s1, s2, normal, infinite) {
  normal = normal.normalize()

  let dir = normal.perpendicular()

  let pdot = p.dot(dir)
  let s1dot = s1.dot(dir)
  let s2dot = s2.dot(dir)

  let pdotnorm = p.dot(normal)
  let s1dotnorm = s1.dot(normal)
  let s2dotnorm = s2.dot(normal)

  if (!infinite) {
    if (((pdot < s1dot || approximately(pdot, s1dot)) && (pdot < s2dot || approximately(pdot, s2dot))) || ((pdot > s1dot || approximately(pdot, s1dot)) && (pdot > s2dot || approximately(pdot, s2dot)))) {
      return null // dot doesn't collide with segment, or lies directly on the vertex
    }
    if ((approximately(pdot, s1dot) && approximately(pdot, s2dot)) && (pdotnorm > s1dotnorm && pdotnorm > s2dotnorm)) {
      return Math.min(pdotnorm - s1dotnorm, pdotnorm - s2dotnorm)
    }
    if ((approximately(pdot, s1dot) && approximately(pdot, s2dot)) && (pdotnorm < s1dotnorm && pdotnorm < s2dotnorm)) {
      return -Math.min(s1dotnorm - pdotnorm, s2dotnorm - pdotnorm)
    }
  }

  return -(pdotnorm - s1dotnorm + (s1dotnorm - s2dotnorm) * (s1dot - pdot) / (s1dot - s2dot))
}

const segmentDistance = function (A, B, E, F, direction) {
  // console.log(A, B, E, F, direction)

  let normal = direction.perpendicular()

  let dotA = A.dot(normal)
  let dotB = B.dot(normal)
  let dotE = E.dot(normal)
  let dotF = F.dot(normal)

  let crossA = A.cross(direction)
  let crossB = B.cross(direction)
  let crossE = E.cross(direction)
  let crossF = F.cross(direction)

  let ABmin = Math.min(dotA, dotB)
  let ABmax = Math.max(dotA, dotB)

  let EFmax = Math.max(dotE, dotF)
  let EFmin = Math.min(dotE, dotF)

  // segments that will merely touch at one point
  if (approximately(ABmax, EFmin) || approximately(ABmin, EFmax)) {
    return null
  }

  // segments miss eachother completely
  if (ABmax < EFmin || ABmin > EFmax) {
    return null
  }

  let overlap
  if ((ABmax > EFmax && ABmin < EFmin) || (EFmax > ABmax && EFmin < ABmin)) {
    overlap = 1
  }
  else {
    let minMax = Math.min(ABmax, EFmax)
    let maxMin = Math.max(ABmin, EFmin)

    let maxMax = Math.max(ABmax, EFmax)
    let minMin = Math.min(ABmin, EFmin)

    overlap = (minMax - maxMin) / (maxMax - minMin)
  }

  let ae = E.sub(A)
  let ab = B.sub(A)
  let af = F.sub(A)
  let ef = E.sub(F)

  let crossABE = ae.cross(ab)
  let crossABF = af.cross(ab)

  // lines are colinear
  if (approximately(crossABE, 0) && approximately(crossABF, 0)) {
    let ABnorm = ab.perpendicular().normalize()
    let EFnorm = ef.perpendicular().normalize()

    // segment normals must point in opposite directions

    if (Math.abs(ABnorm.cross(EFnorm)) < TOL && ABnorm.dot(EFnorm) < 0) {
      // normal of AB segment must point in same direction as given direction vector
      let normdot = ABnorm.dot(direction)
      // the segments merely slide along eachother
      if (approximately(normdot, 0)) {
        return null
      }

      if (normdot < 0) {
        return 0
      }
    }

    return null
  }

  let distances = []

  let reverse = direction.negative()

  // coincident points
  if (approximately(dotA, dotE)) {
    distances.push(crossA - crossE);
  }
  else if (approximately(dotA, dotF)) {
    distances.push(crossA - crossF);
  }
  else if (dotA > EFmin && dotA < EFmax) {
    let d = pointDistance(A, E, F, reverse)
    if (d !== null && approximately(d, 0)) { //  A currently touches EF, but AB is moving away from EF
      var dB = pointDistance(B, E, F, reverse, true)
      if (dB < 0 || approximately(dB * overlap, 0)) {
        d = null
      }
    }
    if (d !== null) {
      distances.push(d)
    }
  }

  if (approximately(dotB, dotE)) {
    distances.push(crossB - crossE)
  }
  else if (approximately(dotB, dotF)) {
    distances.push(crossB - crossF)
  }
  else if (dotB > EFmin && dotB < EFmax) {
    let d = pointDistance(B, E, F, reverse)
    if (d !== null && approximately(d, 0)) { // crossA>crossB A currently touches EF, but AB is moving away from EF
      var dA = pointDistance(A, E, F, reverse, true)
      if (dA < 0 || approximately(dA * overlap, 0)) {
        d = null
      }
    }
    if (d !== null) {
      distances.push(d)
    }
  }

  if (dotE > ABmin && dotE < ABmax) {
    let d = pointDistance(E, A, B, direction)
    if (d !== null && approximately(d, 0)) { // crossF<crossE A currently touches EF, but AB is moving away from EF
      let dF = pointDistance(F, A, B, direction, true)
      if (dF < 0 || approximately(dF * overlap, 0)) {
        d = null
      }
    }
    if (d !== null) {
      distances.push(d)
    }
  }

  if (dotF > ABmin && dotF < ABmax) {
    let d = pointDistance(F, A, B, direction)
    if (d !== null && approximately(d, 0)) { // && crossE<crossF A currently touches EF, but AB is moving away from EF
      let dE = pointDistance(E, A, B, direction, true)
      if (dE < 0 || approximately(dE * overlap, 0)) {
        d = null
      }
    }
    if (d !== null) {
      distances.push(d)
    }
  }

  if (distances.length <= 0) {
    return null
  }

  let min = Math.min.apply(Math, distances)
  return min
}

const polygonSlideDistance = function (A, B, direction, ignoreNegative) {
  let AP = A.points.slice(0)
  let BP = B.points.slice(0)

  // close the loop for polygons
  if (AP[0] != AP[AP.length - 1]) {
    AP.push(AP[0])
  }

  if (BP[0] != BP[BP.length - 1]) {
    BP.push(BP[0]);
  }

  let distance = null
  let dir = direction.normalize()

  for (var i = 0; i < BP.length - 1; i++) {
    for (var j = 0; j < AP.length - 1; j++) {
      let A1 = AP[j].add(A.offset)
      let A2 = AP[j + 1].add(A.offset)
      let B1 = BP[i].add(B.offset)
      let B2 = BP[i + 1].add(B.offset)
      if (A1.approximately(A2) || B1.approximately(B2)) {
        continue
      }

      let d = segmentDistance(A1, A2, B1, B2, dir)
      if (d !== null && (distance === null || d < distance)) {
        if (!ignoreNegative || d > 0 || approximately(d, 0)) {
          distance = d
        }
      }
    }
  }

  return distance
}

// project each point of B onto A in the given direction, and return the 
const polygonProjectionDistance = function (A, B, direction) {
  let AP = A.points.slice(0)
  let BP = B.points.slice(0)

  // close the loop for polygons
  if (AP[0] != AP[AP.length - 1]) {
    AP.push(AP[0]);
  }

  if (BP[0] != BP[BP.length - 1]) {
    BP.push(BP[0]);
  }

  let distance = null

  for (var i = 0; i < BP.length; i++) {
    // the shortest/most negative projection of B onto A
    let minProjection = null

    for (var j = 0; j < AP.length - 1; j++) {
      let p = BP[i].add(B.offset)
      let s1 = AP[j].add(A.offset)
      let s2 = AP[j + 1].add(A.offset)

      let s12 = s2.sub(s1)
      if (Math.abs(s12.cross(direction)) < TOL) {
        continue
      }

      // project point, ignore edge boundaries
      let d = pointDistance(p, s1, s2, direction)
      if (d !== null && (minProjection === null || d < minProjection)) {
        minProjection = d
      }
    }

    if (minProjection !== null && (distance === null || minProjection > distance)) {
      distance = minProjection
    }
  }

  return distance
}

const lineIntersect = function (A, B, E, F, infinite) {
  let a1 = B.y - A.y;
  let b1 = A.x - B.x;
  let c1 = B.x * A.y - A.x * B.y;
  let a2 = F.y - E.y;
  let b2 = E.x - F.x;
  let c2 = F.x * E.y - E.x * F.y;

  let denom = a1 * b2 - a2 * b1;

  let x = (b1 * c2 - b2 * c1) / denom
  let y = (a2 * c1 - a1 * c2) / denom

  if (!isFinite(x) || !isFinite(y)) {
    return null
  }

  // lines are colinear
  /*var crossABE = (E.y - A.y) * (B.x - A.x) - (E.x - A.x) * (B.y - A.y);
  var crossABF = (F.y - A.y) * (B.x - A.x) - (F.x - A.x) * (B.y - A.y);
  if(_almostEqual(crossABE,0) && _almostEqual(crossABF,0)){
    return null;
  }*/

  if (!infinite) {
    // coincident points do not count as intersecting
    if (Math.abs(A.x - B.x) > TOL && ((A.x < B.x) ? x < A.x || x > B.x : x > A.x || x < B.x)) return null
    if (Math.abs(A.y - B.y) > TOL && ((A.y < B.y) ? y < A.y || y > B.y : y > A.y || y < B.y)) return null

    if (Math.abs(E.x - F.x) > TOL && ((E.x < F.x) ? x < E.x || x > F.x : x > E.x || x < F.x)) return null
    if (Math.abs(E.y - F.y) > TOL && ((E.y < F.y) ? y < E.y || y > F.y : y > E.y || y < F.y)) return null
  }

  return new Vector(x, y)
}

const intersect = function (A, B) {
  let AP = A.points.slice(0)
  let BP = B.points.slice(0)

  for (let i = 0, n = AP.length; i < n - 1; i++) {
    for (let j = 0, m = BP.length; j < m - 1; j++) {
      let a1 = AP[i].add(A.offset)
      let a2 = AP[i + 1].add(A.offset)
      let b1 = BP[j].add(B.offset)
      let b2 = BP[j + 1].add(B.offset)

      let prevbindex = (j == 0) ? m - 1 : j - 1
      let prevaindex = (i == 0) ? n - 1 : i - 1
      let nextbindex = (j + 1 == m - 1) ? 0 : j + 2
      let nextaindex = (i + 1 == n - 1) ? 0 : i + 2

      // go even further back if we happen to hit on a loop end point
      if (BP[prevbindex] == BP[j] || BP[prevbindex].approximately(BP[j])) {
        prevbindex = (prevbindex == 0) ? m - 1 : prevbindex - 1
      }

      if (AP[prevaindex] == AP[i] || AP[prevaindex].approximately(AP[i])) {
        prevaindex = (prevaindex == 0) ? n - 1 : prevaindex - 1
      }

      // go even further forward if we happen to hit on a loop end point
      if (BP[nextbindex] == BP[j + 1] || BP[nextbindex].approximately(BP[j + 1])) {
        nextbindex = (nextbindex == m - 1) ? 0 : nextbindex + 1
      }

      if (AP[nextaindex] == AP[i + 1] || AP[nextaindex].approximately(AP[i + 1])) {
        nextaindex = (nextaindex == n - 1) ? 0 : nextaindex + 1
      }

      let a0 = AP[prevaindex].add(A.offset)
      let b0 = BP[prevbindex].add(B.offset)

      let a3 = AP[nextaindex].add(A.offset)
      let b3 = BP[nextbindex].add(B.offset)

      if (onSegment(a1, a2, b1) || a1.approximately(b1)) {
        let b0in = pointInPolygon(b0, A)
        let b2in = pointInPolygon(b2, A)
        if ((b0in === true && b2in === false) || (b0in === false && b2in === true)) {
          return true
        }
        else {
          continue;
        }
      }

      if (onSegment(a1, a2, b2) || a2.approximately(b2)) {
        // if a point is on a segment, it could intersect or it could not. Check via the neighboring points
        let b1in = pointInPolygon(b1, A)
        let b3in = pointInPolygon(b3, A)
        if ((b1in === true && b3in === false) || (b1in === false && b3in === true)) {
          return true
        }
        else {
          continue
        }
      }

      if (onSegment(b1, b2, a1) || a1.approximately(b2)) {
        // if a point is on a segment, it could intersect or it could not. Check via the neighboring points
        let a0in = pointInPolygon(a0, B)
        let a2in = pointInPolygon(a2, B)

        if ((a0in === true && a2in === false) || (a0in === false && a2in === true)) {
          return true
        }
        else {
          continue
        }
      }

      if (onSegment(b1, b2, a2) || a2.approximately(b1)) {
        // if a point is on a segment, it could intersect or it could not. Check via the neighboring points
        let a1in = pointInPolygon(a1, B)
        let a3in = pointInPolygon(a3, B)

        if ((a1in === true && a3in === false) || (a1in === false && a3in === true)) {
          return true
        }
        else {
          continue
        }
      }

      let p = lineIntersect(b1, b2, a1, a2)

      if (p !== null) {
        return true
      }
    }
  }

  return false
}

// searches for an arrangement of A and B such that they do not overlap
// if an NFP is given, only search for startpoints that have not already been traversed in the given NFP
const searchStartPoint = function(A, B, inside, NFP) {
  // clone arrays
  let AP = A.points.slice(0)
  let BP = B.points.slice(0)
  // console.log('searchStartPoint', AP, BP)

  // close the loop for polygons
  if (AP[0] != AP[AP.length - 1]) {
    AP.push(AP[0]);
  }

  if (BP[0] != BP[BP.length - 1]) {
    BP.push(BP[0]);
  }

  for (let i = 0; i < AP.length - 1; i++) {
    if (!AP[i].marked) {
      AP[i].mark()

      for (let j = 0; j < BP.length; j++) {
        B.offset.set(AP[i].sub(BP[j]))

        let Binside = null
        for (var k = 0; k < BP.length; k++) {
          let inpoly = pointInPolygon(BP[k].add(B.offset), A);
          if (inpoly !== null) {
            Binside = inpoly
            break;
          }
        }

        if (Binside === null) { // A and B are the same
          return null
        }

        let startPoint = B.offset.clone()
        if (((Binside && inside) || (!Binside && !inside)) && !intersect(A, B) && !inNfp(startPoint, NFP)) {
          return startPoint
        }

        // slide B along vector
        let v = AP[i + 1].sub(AP[i])

        let d1 = polygonProjectionDistance(A, B, v)
        let d2 = polygonProjectionDistance(B, A, v.negative())

        let d = null

        // todo: clean this up
        if (d1 === null && d2 === null) {
          // nothing
        }
        else if (d1 === null) {
          d = d2
        }
        else if (d2 === null) {
          d = d1
        }
        else {
          d = Math.min(d1, d2)
        }

        // only slide until no longer negative
        // todo: clean this up
        if (d !== null && !approximately(d, 0) && d > 0) {
        }
        else {
          continue
        }

        let vd2 = v.squaredLength()

        if (d * d < vd2 && !approximately(d * d, vd2)) {
          var vd = Math.sqrt(vd2)
          v = v.multiplyScalar(d / vd)
        }

        B.offset.add(v)

        for (let k = 0; k < BP.length; k++) {
          let inpoly = pointInPolygon(BP[k].add(B.offset), A)
          if (inpoly !== null) {
            Binside = inpoly
            break
          }
        }

        startPoint = B.offset.clone()
        if (((Binside && inside) || (!Binside && !inside)) && !intersect(A, B) && !inNfp(startPoint, NFP)) {
          return startPoint
        }
      }
    }
  }

  // returns true if point already exists in the given nfp
  return null;
}

const inNfp = function (p, nfp) {
  if (!nfp || nfp.length == 0) {
    return false;
  }

  for (let i = 0, n = nfp.length; i < n; i++) {
    for (let j = 0, m = nfp[i].points.length; j < m; j++) {
      if (p.approximately(nfp[i].points[j])) {
        return true;
      }
    }
  }

  return false
}

// interior NFP for the case where A is a rectangle (Bin)
const noFitRectanglePolygon = function (A, B) {
  let abb = A.bounds()
  let bbb = B.bounds()

  // Returns null if B is larger than A
  if (
    (bbb.max.x - bbb.min.x > abb.max.x - abb.min.x) || 
    (bbb.max.y - bbb.min.y > abb.max.y - abb.min.y)
  ) {
    return null
  }

  let p0 = new Vector(abb.min.x - bbb.min.x, abb.min.y - bbb.min.y)
  let p1 = new Vector(abb.max.x - bbb.max.x, abb.min.y - bbb.min.y)
  let p2 = new Vector(abb.max.x - bbb.max.x, abb.max.y - bbb.max.y)
  let p3 = new Vector(abb.min.x - bbb.min.x, abb.max.y - bbb.max.y)

  return new Polygon([
    B.points[0].add(p0),
    B.points[0].add(p1),
    B.points[0].add(p2),
    B.points[0].add(p3)
  ])
}

// given a static polygon A and a movable polygon B, compute a no fit polygon by orbiting B about A
// if the inside flag is set, B is orbited inside of A rather than outside
// if the edges flag is set, all edges of A are explored for NFPs - multiple 
const noFitPolygon = function (A, B, inside = false, edges = false, debug = false) {

  // Initialize all vertices
  // and get ref to min y of A, max y of B
  let minA = A.points[0].y
  let minAindex = 0

  let maxB = B.points[0].y
  let maxBindex = 0

  const la = A.points.length
  const lb = B.points.length

  for (let i = 1; i < la; i++) {
    A.points[i].unmark()
    if (A.points[i].y < minA) {
      minA = A.points[i].y
      minAindex = i
    }
  }

  for (let i = 1; i < lb; i++) {
    B.points[i].unmark()
    if (B.points[i].y > maxB) {
      maxB = B.points[i].y
      maxBindex = i
    }
  }

  let startPoint = null

  if (!inside) {
    // shift B such that the bottom-most point of B is at the top-most point of A. This guarantees an initial placement with no intersections
    startPoint = A.points[minAindex].sub(B.points[maxBindex])
  }
  else {
    // no reliable heuristic for inside
    startPoint = searchStartPoint(A.clone(), B.clone(), true)
  }

  let result = []

  while (startPoint !== null) {
    // console.log('while start', startPoint, B.offset.clone())
    B.offset.set(startPoint)

    // maintain a list of touching points/edges
    let prevVector = null // keep track of previous vector

    let reference = B.points[0].add(B.offset)
    let NFP = [reference.clone()]
    let start = reference.clone()

    let iterations = 0
    const limit = 10 * (la + lb)

    while ((iterations++) < limit) { // sanity check, prevent infinite loop
      let touching = []

      // find touching vertices/edges
      for (let i = 0; i < la; i++) {
        let nexti = (i === la - 1) ? 0 : i + 1
        for (let j = 0; j < lb; j++) {
          let nextj = (j === lb - 1) ? 0 : j + 1
          let bj = B.points[j].add(B.offset)
          if (A.points[i].approximately(bj)) {
            touching.push({ type: 0, A: i, B: j })
          }
          else if (onSegment(A.points[i], A.points[nexti], bj)) {
            touching.push({ type: 1, A: nexti, B: j })
          }
          else if (onSegment(bj, B.points[nextj].add(B.offset), A.points[i])) {
            touching.push({ type: 2, A: i, B: nextj })
          }
        }
      }

      // generate translation vectors from touching vertices/edges
      let vectors = []
      for (let i = 0, tl = touching.length; i < tl; i++) {
        let vertexA = A.points[touching[i].A]
        vertexA.mark()

        // adjacent A vertices
        let prevAindex = touching[i].A - 1
        let nextAindex = touching[i].A + 1

        prevAindex = (prevAindex < 0) ? la - 1 : prevAindex // loop
        nextAindex = (nextAindex >= la) ? 0 : nextAindex // loop

        let prevA = A.points[prevAindex]
        let nextA = A.points[nextAindex]

        // adjacent B vertices
        let vertexB = B.points[touching[i].B]

        let prevBindex = touching[i].B - 1
        let nextBindex = touching[i].B + 1

        prevBindex = (prevBindex < 0) ? lb - 1 : prevBindex // loop
        nextBindex = (nextBindex >= lb) ? 0 : nextBindex // loop

        let prevB = B.points[prevBindex]
        let nextB = B.points[nextBindex]

        switch (touching[i].type) {
          case 0: {
            let va1 = prevA.sub(vertexA)
            let va2 = nextA.sub(vertexA)

            // B vectors need to be inverted
            let vb1 = vertexB.sub(prevB)
            let vb2 = vertexB.sub(nextB)

            vectors.push(new IndexedVector(va1.x, va1.y, vertexA, prevA))
            vectors.push(new IndexedVector(va2.x, va2.y, vertexA, nextA))
            vectors.push(new IndexedVector(vb1.x, vb1.y, prevB, vertexB))
            vectors.push(new IndexedVector(vb2.x, vb2.y, nextB, vertexB))

            break
          }
          case 1: {
            var vb = vertexB.add(B.offset)
            let va1 = vertexA.sub(vb)
            let va2 = prevA.sub(vb)
            vectors.push(new IndexedVector(va1.x, va1.y, prevA, vertexA))
            vectors.push(new IndexedVector(va2.x, va2.y, vertexA, prevA))
            break
          }
          case 2: {
            let va1 = vertexA.sub(vertexB.add(B.offset))
            let va2 = vertexA.sub(prevB.add(B.offset))
            vectors.push(new IndexedVector(va1.x, va1.y, prevB, vertexB))
            vectors.push(new IndexedVector(va2.x, va2.y, vertexB, prevB))
          }
        }
      }

      // todo: there should be a faster way to reject vectors that will cause immediate intersection. For now just check them all

      let translate = null
      let maxd = 0

      for (let i = 0, n = vectors.length; i < n; i++) {
        if (vectors[i].x == 0 && vectors[i].y == 0) {
          continue
        }

        // if this vector points us back to where we came from, ignore it.
        // ie cross product = 0, dot product < 0
        if (prevVector && vectors[i].dot(prevVector) < 0) {
          // compare magnitude with unit vectors
          let unitVector = vectors[i].normalize()
          let prevUnitVector = prevVector.normalize()

          // we need to scale down to unit vectors to normalize vector length. Could also just do a tan here
          if (Math.abs(unitVector.cross(prevUnitVector)) < 1e-8) {
            continue
          }
        }

        let d = polygonSlideDistance(A, B, vectors[i], true)
        let vecd2 = vectors[i].squaredLength()
        if (d === null || d * d > vecd2) {
          d = Math.sqrt(vecd2)
        }

        if (d !== null && d > maxd) {
          maxd = d
          translate = vectors[i]
        }
      }

      if (translate === null || approximately(maxd, 0)) {
        // didn't close the loop, something went wrong here
        NFP = null
        break
      }

      translate.start.mark()
      translate.end.mark()

      // trim
      let vlength2 = translate.squaredLength()
      let maxd2 = maxd * maxd
      if (maxd2 < vlength2 && !approximately(maxd2, vlength2)) {
        let scale = Math.sqrt(maxd2 / vlength2)
        translate = translate.multiplyScalar(scale)
      }

      prevVector = translate.clone()
      reference = reference.add(translate)

      if (reference.approximately(start)) {
        // we've made a full loop
        break
      }

      // if A and B start on a touching horizontal line, the end point may not be the start point
      let looped = false;

      if (NFP.length > 0) {
        for (let i = 0; i < NFP.length - 1; i++) {
          if (reference.approximately(NFP[i])) {
            looped = true
          }
        }
      }

      if (looped) {
        // we've made a full loop
        break
      }

      NFP.push(reference.clone())

      B.offset = B.offset.add(translate)
    }

    if (NFP && NFP.length > 0) {
      // const offset = B.points[0]
      // NFP.map(p => p.sub(offset))
      // result.push(NFP)
      result.push(new Polygon(NFP))
    }

    if (!edges) {
      // only get outer NFP or first inner NFP
      break
    }

    startPoint = searchStartPoint(A.clone(), B.clone(), inside, result)
  }

  return result
}

const minkowskiDifference = function (A, B) {
  let Ac = toClipperCoordinates(A.points)
  let Bc = toClipperCoordinates(B.points)

  for (let i = 0; i < Bc.length; i++) {
    Bc[i].X *= -1
    Bc[i].Y *= -1
  }

  let solution = ClipperLib.Clipper.MinkowskiSum(Ac, Bc, true)

  let minArea = Number.MAX_VALUE
  let minPolygon = undefined

  for (let i = 0, n = solution.length; i < n; i++) {
    let points = toNestCoordinates(solution[i])
    let polygon = new Polygon(points)
    let area = polygon.area()
    if (area < minArea) {
      minArea = area
      minPolygon = polygon
    }
  }

  const offset = B.points[0]
  return [ minPolygon.translate(offset.x, offset.y) ]
}

// http://www.angusj.com/delphi/clipper/documentation/Docs/Units/ClipperLib/Classes/ClipperOffset/_Body.htm
const offsetPolygon = function (polygon, offset, miterLimit = 2.5, curveTolerance = 1.0) {
  if (approximately(offset, 0)) return polygon

  let clipper = new ClipperLib.ClipperOffset(miterLimit, curveTolerance * clipperScale)

  let path = toClipperCoordinates(polygon.points)
  clipper.AddPath(path, ClipperLib.JoinType.jtSquare, ClipperLib.EndType.etClosedPolygon)

  let paths = new ClipperLib.Paths()
  clipper.Execute(paths, offset * clipperScale)

  // Keep polygon properties
  let cloned = polygon.clone()

  let points = toNestCoordinates(paths[0])
  cloned.points = points

  return cloned
}

const createUniqueKey = function (A, B, inside) {
  return JSON.stringify({
    A: A.toString(),
    B: B.toString(),
    inside: inside
  })
}

export {
  approximately,
  bounds,
  clipperScale, clipperThreshold,
  toClipperCoordinates,
  toNestCoordinates,
  noFitRectanglePolygon,
  noFitPolygon,
  minkowskiDifference,
  offsetPolygon,
  createUniqueKey
}
