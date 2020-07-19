import { Vector2 } from 'three'
import { Partition } from './partition'

export class BallSolver {
    private _positions : Vector2[];
    private _velocities : Vector2[];
    private _masses : number[];
    private _radii : number[];

    private readonly _minRange : Vector2;
    private readonly _maxRange : Vector2;

    private _gravity : number;

    private _coeffOfRestitution : number;
    private _partition : Partition;

    constructor(
        minRange: Vector2,
        maxRange: Vector2,
        maxRadius: number,
        gravity: number,
        coefficientOfRestitution: number) 
    {
        this._positions = [];
        this._velocities = []; 
        this._masses = [];
        this._radii = [];

        this._minRange = minRange;
        this._maxRange = maxRange;

        this._gravity = gravity;
        this._coeffOfRestitution = coefficientOfRestitution;

        this._partition = new Partition(minRange, maxRange, maxRadius * 2);
    }

    AddBall(
        position: Vector2, 
        velocity: Vector2, 
        mass: number, 
        radius: number,
        restitution: number) : void 
    {
        const id = this._positions.length;

        this._positions.push(position);
        this._velocities.push(velocity);
        this._masses.push(mass);
        this._radii.push(radius);

        this._partition.Update(id, position);
    }

    GetBallCount() : number {
        return this._positions.length;
    }

    GetBallPosition(index: number) : Vector2 {
        return this._positions[index];
    }

    GetBallRadius(index: number) : number {
        return this._radii[index];
    }

    AddVelocityToBall(index: number, velocity: Vector2) : void {
        this._velocities[index].add(velocity);
    }

    /**
     * Given a coefficient of restitution,
     * 2 masses, and 2 velocities, this returns the resulting velocities
     * of the objects given due to collision.
     */
    private _Solve1DCollision(
        restitution: number,
        massA : number,
        massB : number,
        velocityA : number,
        velocityB : number) : [number, number] 
    {
        // This can be derived by using conservation of momentum and
        // kinetic energy.
        // See: https://en.wikipedia.org/wiki/Elastic_collision
        const totalMass = massA + massB;
        const totalMomentum = massA * velocityA + massB * velocityB;
        return [
            (restitution * massB * (velocityB - velocityA) + totalMomentum) / totalMass,
            (restitution * massA * (velocityA - velocityB) + totalMomentum) / totalMass
        ];
    }

    Solve(timestep: number) : void {
        // Some variables we'll be reusing on each collision solve.
        let delta = new Vector2();
        let collisionNormal = new Vector2();
        let minTransDelta = new Vector2();
        let offsetA = new Vector2();
        let offsetB = new Vector2();
        let impactVel = new Vector2();
        let velocityOffsetA = new Vector2();
        let velocityOffsetB = new Vector2();

        for (let index = 0; index < this.GetBallCount(); index++) {
            this._HandleWallCollisions(index);
        }
        
        for (const [indexA, indexB] of this._Collisions()) {
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
                .multiplyScalar((radiusA + radiusB - dist)); 
            
            // Determine how much exactly we should offset each ball 
            // position to resolve their collision.
            // The minTransDelta is from A to B, so we need to be sure to
            // negate it for A's offset.
            const massSum = massA + massB;
            offsetA.copy(minTransDelta).multiplyScalar(-massA / massSum);
            offsetB.copy(minTransDelta).multiplyScalar(massB / massSum);

            positionA.add(offsetA);
            positionB.add(offsetB);

            // Fix wall collisions just in case.
            this._HandleWallCollisions(indexA);
            this._HandleWallCollisions(indexB);

            this._partition.Update(indexA, positionA);
            this._partition.Update(indexB, positionB);

            // Using their speeds along the collision normal, we just need
            // to solve the 1D collision case.

            // Calculate ball A and B's speed along the collision normal. 
            const speedAlongCollisionNormalA = 
                velocityA.dot(collisionNormal);
            const speedAlongCollisionNormalB = 
                velocityB.dot(collisionNormal);

            const approachSpeed = 
                speedAlongCollisionNormalA - speedAlongCollisionNormalB;

            if (approachSpeed < 0) {
                continue;
            }

            const [newNormalSpeedA, newNormalSpeedB] = this._Solve1DCollision(
                this._coeffOfRestitution,
                massA, massB,
                speedAlongCollisionNormalA, speedAlongCollisionNormalB
                );

            velocityOffsetA.copy(collisionNormal).multiplyScalar(
                newNormalSpeedA - speedAlongCollisionNormalA);
            velocityOffsetB.copy(collisionNormal).multiplyScalar(
                newNormalSpeedB - speedAlongCollisionNormalB);

            velocityA.add(velocityOffsetA);
            velocityB.add(velocityOffsetB);
        }

        // Add gravity
        let gravityVel = new Vector2(0, timestep * this._gravity);
        for (let index = 0; index < this.GetBallCount(); index++) {
            this._velocities[index].add(gravityVel);
        }

        // Integrate velocity into position
        let integratedVelocity = new Vector2();
        for (let index = 0; index < this.GetBallCount(); index++) {
            integratedVelocity.copy(this._velocities[index]).multiplyScalar(timestep);
            
            const position = this._positions[index];

            position.add(integratedVelocity);
            this._partition.Update(index, position);
        }
    }

    private _HandleWallCollisions(index: number) : void {
        const [position, velocity, _, radius] = this._GetBall(index);

        if (position.x > this._maxRange.x - radius) {
            if (velocity.x > 0) {
                velocity.x *= -this._coeffOfRestitution;
            }
            position.x = this._maxRange.x - radius;
        }

        if (position.x < this._minRange.x + radius) {
            if (velocity.x < 0) {
                velocity.x *= -this._coeffOfRestitution;
            }
            position.x = this._minRange.x + radius;
        }

        if (position.y > this._maxRange.y - radius) {
            if (velocity.y > 0) {
                velocity.y *= -this._coeffOfRestitution;
            }
            position.y = this._maxRange.y - radius;
        }

        if (position.y < this._minRange.y + radius) {
            if (velocity.y < 0) {
                velocity.y *= -this._coeffOfRestitution;
            }
            position.y = this._minRange.y + radius
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
            < Math.pow(radiusA + radiusB, 2);
    }

    /**
     * This yields collisions until there are no more collisions.
     */
    private *_Collisions() : Generator<[number, number]> {
        let collisionsFound = false;
        let iterations = 0;
        while ((iterations == 0 || collisionsFound) && iterations < 6) {
            collisionsFound = false;
            iterations++;
            for (let indexA = 0; indexA < this._positions.length; indexA++) {
                
                const positionA = this._positions[indexA];

                const nearby = this._partition.GetNearby(positionA);
                for (let indexB of nearby) {
                    // Don't collide a ball with itself.
                    if (indexA == indexB) {
                        continue;
                    }

                    if (this._IsColliding(indexA, indexB)) {
                        collisionsFound = true;
                        yield [indexA, indexB];
                    }
                }
            }
        }
    }
}