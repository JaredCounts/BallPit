/**
 * Encapsulates delta time accounting.
 */
type timestepFunction = (timestep_sec : number) => void;

export class TimeManager {

    private readonly _timestep_ms : number;
    private readonly _timestep_sec : number;
    private readonly _timestepLimitPerUpdate : number;

    private _lastUpdateTime : number;
    private _leftoverTime_ms : number;

    constructor(timestep_ms : number, timestepLimitPerUpdate : number) {
        this._timestep_ms = timestep_ms;
        this._timestep_sec = this._timestep_ms / 1000.0;
        this._timestepLimitPerUpdate = timestepLimitPerUpdate;
        this._lastUpdateTime = Date.now();
        this._leftoverTime_ms = 0;
    }

    /**
     * Based on the time since the last update, calls the given callback 
     * function with fixed sized timesteps to catch up with the current time.
     */
    Update(callback : timestepFunction) {
        let time = Date.now();
        
        let elapsed_ms = time - this._lastUpdateTime;

        // The timestepCount is the number of times we can fit a single timestep
        // in the total elapsed time plus any "leftover" fractional time from 
        // the last update.
        let timestepCount = 
            Math.floor(
                (elapsed_ms + this._leftoverTime_ms) / this._timestep_ms);
        
        // The leftover time is any amount of time in the total elapsed time 
        // that can't fit into a single timestep.
        this._leftoverTime_ms = 
            (elapsed_ms + this._leftoverTime_ms) 
                - timestepCount * this._timestep_ms;

        // Clamp the timestep count to prevent any lag spikes from carrying over
        // too much.
        timestepCount = Math.min(timestepCount, this._timestepLimitPerUpdate);

        for (let i = 0; i < timestepCount; i++) {
            callback(this._timestep_sec);
        }

        // Remember this time as the last update time.
        this._lastUpdateTime = time;
    }
}