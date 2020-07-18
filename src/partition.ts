import { Vector2 } from 'three'

/**
 * For efficient collision finding.
 */
export class Partition {
    private _idToBucket : Map<number, [number, number]>;
    private _buckets : number[][][];

    private readonly _cellSize : number;
    private readonly _minRange : Vector2;

    /*
     * Min and max range tells us the minimum and maximum coordinates objects
     * can occupy. 
     * maxDistance is the maximum distance between two objects can be to each 
     * other and still collide. Any pair of objects more than maxDistance from
     * each other cannot collide.
     */
    constructor(
        minRange: Vector2,
        maxRange: Vector2,
        maxDistance: number) 
    {
        this._cellSize = maxDistance;
        this._minRange = minRange;

        const xCount = (maxRange.x - minRange.x) / this._cellSize;
        const yCount = (maxRange.y - minRange.y) / this._cellSize;

        console.log(xCount, yCount);

        this._idToBucket = new Map<number, [number, number]>();

        // Instantiate the buckets
        this._buckets = [];
        for (let x = 0; x < xCount; x++) {
            this._buckets[x] = []
            for (let y = 0; y < yCount; y++) {
                this._buckets[x][y] = []
            }
        }
    }

    /**
     * Update the given object in the internal model.
     */
    Update(id: number, position: Vector2) : void
    {
        const bucketIndices = this._PositionToBucketIndices(position);
        let addToBucket = false;

        if (this._idToBucket.has(id)) {
            const oldBucketIndices = this._idToBucket.get(id);
            if (oldBucketIndices != bucketIndices) {
                // Remove from the old bucket
                const oldBucket = 
                    this._buckets[oldBucketIndices[0]][oldBucketIndices[1]];

                const index = oldBucket.indexOf(id);
                oldBucket.splice(index, 1);
            
                // Since the object moved, set the flag to set add it to its new
                // bucket.
                addToBucket = true;
            }
        }
        // If it's not in the idToBucket map, then this is our first time seeing
        // this object. Set the flag to add it to its respective bucket.
        else {
            addToBucket = true;
        }

        // If we need to add to bucket (either because it moved or this is the
        // first time we've seen this object), then add it.
        if (addToBucket) {
            const bucket = 
                this._buckets[bucketIndices[0]][bucketIndices[1]];
            bucket.push(id);
        }
        

        this._idToBucket.set(id, bucketIndices);
    }

    /**
     * Return every object that's close to the given position.
     */
    GetNearby(position: Vector2) : number[] {
        const [bucketX, bucketY] = this._PositionToBucketIndices(position);

        const bucketMinX = Math.max(bucketX - 1, 0);
        const bucketMaxX = Math.min(bucketX + 1, this._buckets.length-1);

        const bucketMinY = Math.max(bucketY - 1, 0);
        const bucketMaxY = Math.min(bucketY + 1, this._buckets[0].length-1);

        const nearby = [];
        for (let x = bucketMinX; x <= bucketMaxX; x++) {
            for (let y = bucketMinY; y <= bucketMaxY; y++) {
                nearby.push(...this._buckets[x][y]);
            }
        }

        return nearby;
    }

    private _PositionToBucketIndices(position: Vector2) : [number, number] {
        return [
            Math.floor((position.x - this._minRange.x) / this._cellSize),
            Math.floor((position.y - this._minRange.y) / this._cellSize)];
    }

}