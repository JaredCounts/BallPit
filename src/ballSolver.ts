import { Vector2 } from 'three'
import { Partition } from './partition'

/**
 * Simulate a ball pit.
 * 
 */
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

    /**
     * Add a ball with the given properties to the ball pit.
     */
    AddBall(
        position: Vector2, 
        velocity: Vector2, 
        mass: number, 
        radius: number) : void 
    {
        const id = this._positions.length;

        this._positions.push(position);
        this._velocities.push(velocity);
        this._masses.push(mass);
        this._radii.push(radius);

        this._partition.Update(id, position);
    }

    /**
     * Return the number of balls in the pit.
     */
    GetBallCount() : number {
        return this._positions.length;
    }

    /**
     * Get the position of the ball with the given index.
     */
    GetBallPosition(index: number) : Vector2 {
        return this._positions[index];
    }

    /**
     * Get the radius of the ball with the given index.
     */
    GetBallRadius(index: number) : number {
        return this._radii[index];
    }

    /**
     * Add a velocity impulse to a given ball.
     */
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
        // See: https://en.wikipedia.org/wiki/Inelastic_collision
        const totalMass = massA + massB;
        const totalMomentum = massA * velocityA + massB * velocityB;
        return [
            (restitution * massB * (velocityB - velocityA) + totalMomentum) 
                / totalMass,
            (restitution * massA * (velocityA - velocityB) + totalMomentum) 
                / totalMass
        ];
    }

    Solve(timestep: number) : void {
        // Handle wall collisions
        for (let index = 0; index < this.GetBallCount(); index++) {
            this._HandleWallCollisions(index);
        }
        
        // Handle ball-to-ball collisions
        for (const [indexA, indexB] 
            of this._Collisions(/* maxTestsPerBall */ 6)) 
        {
            this._HandleCollision(indexA, indexB);

            // Can't hurt to re-enforce wall constraints here.
            this._HandleWallCollisions(indexA);
            this._HandleWallCollisions(indexB);
        }

        // Add gravity
        let gravityVel = new Vector2(0, timestep * this._gravity);
        for (let index = 0; index < this.GetBallCount(); index++) {
            this._velocities[index].add(gravityVel);
        }

        // Integrate velocity into position
        let integratedVelocity = new Vector2();
        for (let index = 0; index < this.GetBallCount(); index++) {
            integratedVelocity.copy(this._velocities[index])
                .multiplyScalar(timestep);
            
            const position = this._positions[index];

            position.add(integratedVelocity);
            this._partition.Update(index, position);
        }
    }

    /**
     * Given the indices of two balls that are colliding, this handles that 
     * collision by translating the balls and updating their velocities.
     */
    private _HandleCollision(indexA: number, indexB: number) : void {
        let [positionA, velocityA, massA, radiusA] = 
            this._GetBall(indexA);
        let [positionB, velocityB, massB, radiusB] = 
            this._GetBall(indexB);

        // Vector from ball A to B.
        // delta = B - A
        const delta = new Vector2();
        delta.copy(positionB).sub(positionA);
        let dist = delta.length();

        // Handle edge case if 2 balls are perfectly overlapping                
        if (dist == 0) {
            dist = radiusA + radiusB - 1;
            delta.set(radiusA + radiusB, 0);
        }

        const collisionNormal = new Vector2();
        collisionNormal.copy(delta).multiplyScalar(1.0 / dist);

        // Minimum translation delta.
        // This is the vector from ball A to ball B, but with a length
        // of radiusA + radiusB.
        const minTransDelta = new Vector2();
        minTransDelta
            .copy(collisionNormal)
            .multiplyScalar((radiusA + radiusB - dist)); 
        
        // Determine how much exactly we should offset each ball 
        // position to resolve their collision.
        // The minTransDelta is from A to B, so we need to be sure to
        // negate it for A's offset.
        const massSum = massA + massB;
        const offsetA = new Vector2();
        const offsetB = new Vector2();
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

        // If they're already moving apart, then we'll skip the velocity update.
        const approachSpeed = 
            speedAlongCollisionNormalA - speedAlongCollisionNormalB;

        if (approachSpeed < 0) {
            return;
        }

        const [newNormalSpeedA, newNormalSpeedB] = this._Solve1DCollision(
            this._coeffOfRestitution,
            massA, massB,
            speedAlongCollisionNormalA, speedAlongCollisionNormalB
            );

        const velocityOffsetA = new Vector2();
        const velocityOffsetB = new Vector2();
        velocityOffsetA.copy(collisionNormal).multiplyScalar(
            newNormalSpeedA - speedAlongCollisionNormalA);
        velocityOffsetB.copy(collisionNormal).multiplyScalar(
            newNormalSpeedB - speedAlongCollisionNormalB);

        velocityA.add(velocityOffsetA);
        velocityB.add(velocityOffsetB);
    }

    /**
     * Handle ball-to-wall collisions.
     */
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

    /**
     * Return whether ball of indexA is colliding with ball of indexB.
     */
    private _IsColliding(indexA: number, indexB: number) : boolean {
        const [positionA, radiusA] = this._GetBallPosAndRadius(indexA);
        const [positionB, radiusB] = this._GetBallPosAndRadius(indexB);

        return positionA.distanceToSquared(positionB) 
            < Math.pow(radiusA + radiusB, 2);
    }

    /**
     * This yields collisions until there are no more collisions.
     * A given ball will be checked with its neighbors a maximum of 
     * maxTestsPerBall times.
     */
    private *_Collisions(
        maxTestsPerBall : number) : Generator<[number, number]> 
    {
        let collisionsFound = false;
        let iterations = 0;

        // We keep iterating until no more collisions are found, or we hit the
        // max iteration count. 
        while ((iterations == 0 || collisionsFound) 
                && iterations < maxTestsPerBall) {
            collisionsFound = false;
            iterations++;

            for (let indexA = 0; indexA < this._positions.length; indexA++) {
                const positionA = this._positions[indexA];

                // Use our partition to get nearby neighbors. This prevents us
                // from having to do O(n^2) checks.
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