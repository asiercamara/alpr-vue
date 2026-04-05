import { defineStore } from 'pinia'

export const usePlateStore = defineStore('plateStore', {
  state: () => ({
    plates: []
  }),
  actions: {
    addPlate(plate) {
      // Avoid duplicates
      if (!this.plates.find(p => p.id === plate.id)) {
        this.plates.unshift({
          ...plate,
          timestamp: new Date()
        })
      }
    },
    removePlate(plateId) {
      this.plates = this.plates.filter(p => p.id !== plateId)
    },
    clearPlates() {
      this.plates = []
    }
  }
})
