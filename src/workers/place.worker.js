
import { approximately, bounds, createUniqueKey, toClipperCoordinates, toNestCoordinates, clipperScale, clipperThreshold } from '../util'
import Polygon from '../math/polygon'
import Part from '../part'
import Bin from '../bin'
import Vector from '../math/vector'
import ClipperLib from 'clipper-lib'
import Placement from '../placement'

const place = function (bins, parts, nfpCache) {

  // rotate paths by given rotation
  parts = parts.map(part => {
    return part.rotate(part.rotation)
  })

  let allPlacements = []
  let cost = 0;


  for (let idx = 0; idx < bins.length; idx++) {
    let placed = []
    let placements = []
    let bin = bins[idx]
    let binArea = Math.abs(bin.area())

    cost += 1 // cost for each new bin opened

    let minWidth = null

    for (let i = 0; i < parts.length; i++) {
      let part = parts[i]

      // inner NFP
      let key = createUniqueKey(bin, part, false)
      var binNfp = nfpCache[key];

      // part unplaceable, skip
      if (!binNfp || binNfp.length <= 0) {
        continue
      }

      // ensure all necessary NFPs exist
      let error = placed.find(p => {
        return !nfpCache[createUniqueKey(p, part, false)]
      }) !== undefined
      if (error) {
        continue
      }

      // First placement, put it on the left
      if (placed.length <= 0) {
        let newPlacement = null
        for (let j = 0, n = binNfp.length; j < n; j++) {
          for (let k = 0, m = binNfp[j].points.length; k < m; k++) {
            let point = Vector.fromJSON(binNfp[j].points[k])
            if ((newPlacement === null) || (point.x - part.points[0].x) < newPlacement.x) {
              newPlacement = new Placement(bin.id, part.id, point.sub(part.points[0]), part.rotation)
            }
          }
        }
        placements.push(newPlacement)
        placed.push(part)

        continue
      }

      let clipperBinNfp = []
      for (let j = 0, m = binNfp.length; j < m; j++) {
        clipperBinNfp.push(toClipperCoordinates(binNfp[j].points))
      }

      let clipper = new ClipperLib.Clipper()

      for (let j = 0; j < placed.length; j++) {
        let key = createUniqueKey(placed[j], part, false)
        let nfp = nfpCache[key]

        if (!nfp) {
          // console.log('continue', key)
          continue
        }

        // console.log(key, nfp)

        for (let k = 0; k < nfp.length; k++) {
          let clone = toClipperCoordinates(nfp[k].points)

          for (let m = 0; m < clone.length; m++) {
            clone[m].X += placements[j].position.x * clipperScale
            clone[m].Y += placements[j].position.y * clipperScale
          }

          clone = ClipperLib.Clipper.CleanPolygon(clone, clipperThreshold)
          let area = Math.abs(ClipperLib.Clipper.Area(clone))
          if (clone.length > 2 && area > 0.1 * clipperScale * clipperScale) {
            clipper.AddPath(clone, ClipperLib.PolyType.ptSubject, true)
          } else {
            // console.log('failed to add', clone)
          }
        }
      }

      let combinedNfp = new ClipperLib.Paths()
      if (!clipper.Execute(ClipperLib.ClipType.ctUnion, combinedNfp, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)) {
        // console.log('failed to clip')
        continue
      }

      // Difference with bin polygon
      let finalNfp = new ClipperLib.Paths()
      clipper = new ClipperLib.Clipper() // clear

      clipper.AddPaths(combinedNfp, ClipperLib.PolyType.ptClip, true)
      clipper.AddPaths(clipperBinNfp, ClipperLib.PolyType.ptSubject, true)
      if (!clipper.Execute(ClipperLib.ClipType.ctDifference, finalNfp, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)) {
        // console.log('failed to clip 2')
        continue
      }

      finalNfp = ClipperLib.Clipper.CleanPolygons(finalNfp, clipperThreshold)

      for (let j = 0; j < finalNfp.length; j++) {
        var area = Math.abs(ClipperLib.Clipper.Area(finalNfp[j]))
        if (finalNfp[j].length < 3 || area < 0.1 * clipperScale * clipperScale) {
          finalNfp.splice(j, 1)
          j--
        }
      }

      if (!finalNfp || finalNfp.length <= 0) {
        continue;
      }

      let candidates = []
      for (let j = 0; j < finalNfp.length; j++) {
        // back to normal scale
        let points = toNestCoordinates(finalNfp[j])
        candidates.push(new Polygon(points))
      }

      let newPlacement = null

      // choose placement that results in the smallest bounding box
      // could use convex hull instead, but it can create oddly shaped nests (triangles or long slivers) which are not optimal for real-world use
      // todo: generalize gravity direction
      let minArea = null
      let minX = null

      for (let j = 0; j < candidates.length; j++) {
        let polygon = candidates[j]

        if (Math.abs(polygon.area()) < 2) {
          continue
        }

        for (let k = 0; k < polygon.points.length; k++) {
          let allPoints = []

          for (let m = 0; m < placed.length; m++) {
            let placedPart = placed[m]
            let placement = placements[m]
            for (let n = 0; n < placedPart.points.length; n++) {
              allPoints.push(placedPart.points[n].add(placement.position))
            }
          }

          let point = polygon.points[k]
          let shiftVector = new Placement(bin.id, part.id, point.sub(part.points[0]), part.rotation)

          for (let m = 0; m < part.points.length; m++) {
            // allPoints.push({ x: part[m].x + shiftVector.x, y: part[m].y + shiftVector.y })
            allPoints.push(part.points[m].add(shiftVector.position))
          }

          let bb = bounds(allPoints)

          // weigh width more, to help compress in direction of gravity
          let area = bb.width * 2 + bb.height

          if (minArea === null || area < minArea || (approximately(minArea, area) && (minX === null || shiftVector.position.x < minX))) {
            newPlacement = shiftVector
            minArea = area
            minWidth = bb.width * bb.height
            minX = shiftVector.position.x
          }
        }
      }

      if (newPlacement !== null) {
        placements.push(newPlacement)
        placed.push(part)
      }

    }

    if (minWidth !== null) {
      cost += minWidth / binArea
    }

    // Remove placed parts from unplaced
    for (let i = 0; i < placed.length; i++) {
      let index = parts.indexOf(placed[i])
      if (index >= 0) {
        parts.splice(index, 1)
      }
    }

    if (placements && placements.length > 0) {
      // allPlacements.push(placements)
      allPlacements = allPlacements.concat(placements)
    }
    else {
      break // something went wrong
    }

  }

  // there were parts that couldn't be placed
  cost += 2 * parts.length

  return { placements: allPlacements, cost: cost, unplaced: parts }
}

self.addEventListener('message', (e) => {
  let data = e.data
  let bins = data.bins.map(json => Bin.fromJSON(json))
  let parts = data.parts.map(json => Part.fromJSON(json))
  let result = place(bins, parts, data.nfpCache)
  self.postMessage({ result: result })
})
