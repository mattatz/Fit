
import DNA from './dna'

export default class GA {

  constructor(rnd, gene, config = { steps: 4, population: 30, mutationRate: 0.2 }) {
    this.rnd = rnd
    this.generations = 0
    this.population = []

    this.config = config
    {
      this.config.steps = this.config.steps || 4
      this.config.mutationRate = this.config.mutationRate || 0.2
    }

    const count = Math.max(3, Number(this.config.population || 0))
    for (let i = 0; i < count; i++) {
      this.population.push(this.adam(gene, this.config.steps))
    }
  }

  adam(length, steps = 4) {
    let gene = []
    for (let i = 0; i < length; i++) {
      let v = Math.floor(this.rnd.randFloat() * steps) % steps
      gene.push(v)
    }
    return new DNA(gene)
  }

  step() {
    this.generations++

    let pool = this.select()
    if (pool.length <= 0) {
      // console.warn('pool is empty.', this.population)
      // all DNA has same genes error.
      pool = this.population
    }

    for (let i = 0, n = this.population.length; i < n; i++) {
      let mi = this.rnd.randInt(0, pool.length)
      let di = this.rnd.randInt(0, pool.length)

      let mon = pool[mi]
      let dad = pool[di]
      let child = mon.crossOver(this.rnd, dad)
      child = child.mutate(this.rnd, this.config.mutationRate, this.config.steps)

      this.population[i] = child
    }
  }

  select() {
    let pool = []
    let range = this.getMinMaxCost()
    let l = range.max - range.min
    this.population.forEach(dna => {
      // normalize
      let cost01 = 1.0 - (dna.cost - range.min) / l
      let n = Math.floor(cost01 * 50)
      for (let i = 0; i < n; i++) {
        pool.push(dna)
      }
    })
    return pool
  }

  // get dna with minimum cost
  getDominant() {
    let dominant = null
    let min = Number.MAX_VALUE
    this.population.forEach(dna => {
      if (dna.cost < min) {
        min = dna.cost
        dominant = dna
      }
    })
    return dominant
  }

  getMinMaxCost() {
    let min = Number.MAX_VALUE
    let max = Number.MIN_VALUE
    this.population.forEach(dna => {
      max = Math.max(max, dna.cost)
      min = Math.min(min, dna.cost)
    })
    return {
      min: min,
      max: max
    }
  }

}