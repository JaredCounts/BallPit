import { Ball } from './ball'
import { Vector2 } from 'three'


export class BallSolver {
    private _positions : Vector2[];
    private _velocities : Vector2[];
    private _masses : number[];
    private _radii : number[];

    constructor() {
        this._positions = [];
        this._velocities = []; 
        this._masses = [];
        this._radii = [];
    }

    Solve (timestep: number) : void {
        // Some variables we'll be reusing on each collision solve.
        let delta : Vector2;
        let collisionNormal : Vector2;
        let minTransDelta : Vector2;
        let offsetA : Vector2;
        let offsetB : Vector2;
        let impactVel : Vector2;
        let velocityOffsetA : Vector2;
        let velocityOffsetB : Vector2;
        
        for (const [indexA, indexB] of this._Collisions()) {
            let colliding = true;
            while (colliding) {
                let [positionA, velocityA, massA, radiusA] = 
                    this._GetBall(indexA);
                let [positionB, velocityB, massB, radiusB] = 
                    this._GetBall(indexB);

                // Vector from ball A to B.
                // delta = B - A
                delta.copy(positionB).sub(positionA);
                let dist = delta.length();

                // Handle edge case if 2 balls are perfectly overlapping                
                if (dist == 0) {
                    dist = radiusA + radiusB - 1;
                    delta.set(radiusA + radiusB, 0);
                }

                collisionNormal.copy(delta).multiplyScalar(1.0 / dist);

                // Minimum translation delta.
                // This is the vector from ball A to ball B, but with a length
                // of radiusA + radiusB.
                minTransDelta
                    .copy(collisionNormal)
                    .multiplyScalar(radiusA + radiusB); 
                
                // Determine how much exactly we should offset each ball 
                // position to resolve their collision.
                // The minTransDelta is from A to B, so we need to be sure to
                // negate it for A's offset.
                const massSum = massA + massB;
                offsetA.copy(minTransDelta).multiplyScalar(-massA / massSum);
                offsetB.copy(minTransDelta).multiplyScalar(massB / massSum);

                positionA.add(offsetA);
                positionB.add(offsetB);

                // Impact velocity
                // impactVel.copy(velocityB).sub(velocityA);


                // // Project the impact velocity along the collision vector 
                // // (collisionNormal). This is how fast each ball is moving directly
                // // at each other, in the frame of A->B, disregarding any 
                // // side-to-side motion.
                // const speedAlongCollisionNormal = collisionNormal.dot(impactVel);

                // // If, for some reason, A and B are moving away from each other
                // // already, then there's nothing left to do.
                // if (speedAlongCollisionNormal < 0) {
                //     continue;
                // }

                // Using their speeds along the collision normal, we just need
                // to solve the 1D collision case.

                // Calculate ball A and B's speed along the collision normal. 
                const speedAlongCollisionNormalA = 
                    velocityA.dot(collisionNormal);
                const speedAlongCollisionNormalB = 
                    velocityB.dot(collisionNormal);

                // This can be derived by using conservation of momentum and
                // kinetic energy.
                // See: https://en.wikipedia.org/wiki/Elastic_collision
                const newSpeedAlongCollisionNormalA = 
                    (speedAlongCollisionNormalA * (massA - massB) 
                        + 2 * massB * speedAlongCollisionNormalB)
                    / (massA + massB);
                const newSpeedAlongCollisionNormalB = 
                    (speedAlongCollisionNormalB * (massB - massA) 
                        + 2 * massA * speedAlongCollisionNormalA)
                    / (massA + massB);

                velocityOffsetA.copy(collisionNormal).multiplyScalar(
                    newSpeedAlongCollisionNormalA - speedAlongCollisionNormalA);
                velocityOffsetB.copy(collisionNormal).multiplyScalar(
                    newSpeedAlongCollisionNormalB - speedAlongCollisionNormalB);

                velocityA.add(velocityOffsetA);
                velocityB.add(velocityOffsetB);
            }
        }
    }

    private _GetBall(index: number) : [Vector2, Vector2, number, number] {
        return [
            this._positions[index], 
            this._velocities[index], 
            this._masses[index], 
            this._radii[index]];
    }

    private _GetBallPosAndRadius(index: number) : [Vector2, number] {
        return [
            this._positions[index],
            this._radii[index]];
    }

    private _IsColliding(indexA: number, indexB: number) : boolean {
        const [positionA, radiusA] = this._GetBallPosAndRadius(indexA);
        const [positionB, radiusB] = this._GetBallPosAndRadius(indexB);

        return positionA.distanceToSquared(positionB) 
            < Math.pow(radiusA + radiusB, 2));
    }

    /**
     * This yields collisions until there are no more collisions.
     */
    private *_Collisions() : Generator<[number, number]> {
        let collisionsFound = false;
        let iterations = 0;
        while (collisionsFound && iterations < 10) {
            iterations++;
            for (let indexA = 0; indexA < this._positions.length; indexA++) {
                for (let indexB = indexA+1; indexB < this._positions.length; indexB++) {
                    if (this._IsColliding(indexA, indexB)) {
                        collisionsFound = true;
                        yield [indexA, indexB];
                    }
                }
            }
        }
    }
}