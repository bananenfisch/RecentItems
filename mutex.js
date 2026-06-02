/**
 * Simple promise based mutex with destroy functionality.
 */
export default class Mutex {
  constructor() {
    this._locked = false;
    this._waiting = [];
    this._destroyed = false;
  }
  
  isLocked() {
    return this._locked;
  }
  
  /**
   * Acquires the lock.
   * @returns {Promise<Function>} A promise that resolves with an unlock function.
   */
  lock() {
    if (this._destroyed) {
      return Promise.reject(new Error("Mutex is destroyed"));
    }
    
    const unlock = () => {
      if (this._destroyed) {
        return;
      }
      if (this._waiting.length > 0) {
        const next = this._waiting.shift();
        next.resolve(unlock);
      } else {
        this._locked = false;
      }
    };

    if (this._locked) {
      return new Promise((resolve, reject) => {
        if (this._destroyed) {
          reject(new Error("Mutex is destroyed"));
          return;
        }
        this._waiting.push({ resolve, reject });
      });
    } else {
      this._locked = true;
      return Promise.resolve(unlock);
    }
  }
  
  /**
   * Destroys the mutex by rejecting all pending locks and preventing further lock acquisitions.
   */
  destroy() {
    this._destroyed = true;
    // Reject all waiting promises.
    for (const waiter of this._waiting) {
      waiter.reject(new Error("Mutex is destroyed"));
    }
    this._waiting = [];
  }
}