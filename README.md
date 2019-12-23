Fit
=====================

Irregular bin packing library by JavaScript.  
*Fit* is a port of *[SVGnest](https://github.com/Jack000/SVGnest)* project for modularity.  

## Demo

[Interactive Demo](https://mattatz.github.io/Fit/demo/index.html)

![demo](https://raw.githubusercontent.com/mattatz/Fit/master/captures/demo.png)  
No spacing result    

![spacing](https://raw.githubusercontent.com/mattatz/Fit/master/captures/spacing.png)  
Enable spacing (= 10) result

## Usage

```js

let bins = [
  // array of 2D Bins
  new Fit.Bin(
    1,    // unique id for each bins
    1200, // width of a bin
    600   // height of a bin
  ),
  ...
]

let parts = [
  // array of 2D Polygons
  new Fit.Part(
    1,  // unique id for each parts
    [   // array of 2D points
      new Fit.Vector(0, 0),
      new Fit.Vector(100, 0),
      new Fit.Vector(120, 400),
      ...
    ]
  ),
  ...
]


let packer = new Fit.Packer()

let config = { 
  spacing: 0,         // space between parts
  rotationSteps: 4,   // # of angles for available rotation (ex. 4 means [0, 90, 180, 270] angles from 360 / 4 )
  population: 10,     // # of population in GA
  generations: 10,    // # of generations in GA
  mutationRate: 0.25, // mutation rate in GA
  seed: 0             // seed of random value in GA
}

packer.start(bins, parts, config, {
  onEvaluation: (e) => {
    // e.progress   : evaluation progress in a generation of GA
  },
  onPacking: (e) => {
    // callback on packing once
    // e.placed     : placed parts
    // e.placements : transformations of placed ({ bin: id, part: id, position: (x, y), rotation: angle }, rotation must be done before translation)
    // e.unplaced   : unplaced parts

    // If unplaced parts exist, you can add a new bin in a process
    if (e.unplaced.length > 0) {
      let lastBin = e.bins[e.bins.length - 1]
      let newBin = new Fit.Bin(lastBin.id + 1, lastBin.width, lastBin.height)
      packer.addBin(newBin)
    }
  },
  onPackingCompleted: (e) => {
    // callback on packing completed
    // e contains same data as an onPacking argument.
  }
})

// packer.stop() // Stop a process

```

## Sources

- SVGnest - https://github.com/Jack000/SVGnest

## License

[MIT](LICENSE)
