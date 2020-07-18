export class WaveSolver {
    private readonly _velocity: number[][];
    private readonly _density: number[][];

    private readonly _friction: number;
    private readonly _speed: number;

    constructor(cellCountX: number, cellCountY: number) {
        this._velocity = [];
        this._density = [];

        this._friction = 0.58;
        this._speed = 20.0;

        // Fill the 2D arrays with all zeroes.
        for (let i = 0; i < cellCountX; i++) {
            this._velocity[i] = [];
            this._density[i] = [];

            for (let j = 0; j < cellCountY; j++) {
                this._velocity[i][j] = 0.0;
                this._density[i][j] = 0.0;
            }
        }
    }

    Solve(timeStep : number) : void {
        // xxx: My old code had some logic errors that ended up giving pretty
        // neat results. Using the proper wave equations here gives something
        // more physically accurate, but I've not been able to tune the 
        // parameters to get them to match what I had before.
        for (let i = 0; i < this._velocity.length; i++) {
            for (let j = 0; j < this._velocity[i].length; j++) {
                const densDiff = 
                    this._GetAdjacentSum(this._density, i, j) 
                    - 4.0 * this._density[i][j];
                
                this._velocity[i][j] = 
                    this._friction * this._velocity[i][j] 
                    + densDiff * timeStep * this._speed;
                
                this._density[i][j] += this._velocity[i][j];
            }
        }
    }

    AddVelocity(amount: number, i: number, j: number) : void {
        this._velocity[Math.floor(i)][Math.floor(j)] += amount;
    }

    GetCellCountX() : number {
        return this._velocity.length;
    }

    GetCellCountY() : number {
        return this._velocity[0].length;
    }

    GetDensity(i: number, j: number) : number {
        return this._density[Math.floor(i)][Math.floor(j)];
    }

    GetVelocity(i: number, j: number) : number {
        return this._velocity[Math.floor(i)][Math.floor(j)];
    }

    private _GetAdjacentSum(arr: number[][], i: number, j: number) : number {
        let sum = 0;

        sum += arr[Math.max(i-1, 0)][j];
        sum += arr[i][Math.max(j-1, 0)];

        sum += arr[Math.min(i+1, arr.length-1)][j];
        sum += arr[i][Math.min(j+1, arr[i].length-1)];

        return sum;
    }

}