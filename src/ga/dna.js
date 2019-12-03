
import { stdSeed } from '../math/gaussian'

export default class DNA {

  constructor (genes = []) {
    this.genes = genes
    this.cost = 1e5 // initial value for a failed case
    this.options = {}
  }

  clone() {
    let cloned = new DNA(this.genes.map(v => v))
    cloned.cost = this.cost
    cloned.options = this.options
    return cloned
  }

  evaluate(cost, options = {}) {
    this.cost = cost
    this.options = options
  }

  crossOver(rnd, partner) {
    let childGenes = []
    let mid = Math.floor(rnd.randFloat() * this.genes.length)

    // Take "half" from one and "half" from the other
    for (let i = 0, n = this.genes.length; i < n; i++) {
      if (i > mid) {
        childGenes[i] = this.genes[i]
      } else {
        childGenes[i] = partner.genes[i]
      }
    }

    return new DNA(childGenes)
  }

  mutate(rnd, m, steps) {
    let genes = []
    for (let i = 0, n = this.genes.length; i < n; i++) {
      let v = this.genes[i]
      if (rnd.randFloat() <= m) {
        let delta = stdSeed(rnd, 0, 1) * steps
        v = Math.floor(v + delta) % steps
        if(v < 0) {
          v = (steps + v) % steps
        }
      }
      genes.push(v)
    }
    return new DNA(genes)
  }

}

