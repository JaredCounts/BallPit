import * as THREE from 'three';
import { BallSolver } from './ballSolver';

/**
 * The "view" of our application. Given the wave solver, this will render to
 * match the wave solver's current state.
 */
export class View {
    private readonly _scene : THREE.Scene;
    private readonly _renderer : THREE.WebGLRenderer;
    private readonly _camera : THREE.Camera;

    private readonly _ballSolver : BallSolver;
    private _ballMeshes: THREE.LineLoop[];

    constructor(parentElement: HTMLElement, ballSolver: BallSolver) {
        this._ballSolver = ballSolver;

        this._scene = new THREE.Scene();
        
        this._renderer = new THREE.WebGLRenderer();
        this._renderer.setSize(
            parentElement.offsetWidth, parentElement.offsetHeight);

        const aspect = parentElement.offsetWidth / parentElement.offsetHeight;

        // The screen space is resized to [-1,1] along the x-axis.
        this._camera = new THREE.OrthographicCamera(
            /* left */ -1.0,
            /* right */ 1.0,
            /* top */ -1.0/aspect,
            /* bottom */ 1.0/aspect,
            /* near */ 0.1,
            /* far */ 7000);

        this._camera.position.x = 0;
        this._camera.position.y = 0;
        // The camera is orthographic, so things don't scale with distance. 
        // That means the z-coordinate we choose here doesn't matter, as long as
        // it's positive.
        this._camera.position.z = 1;

        // Populate the scene with the balls.
        this._ballMeshes = [];
        for (let i = 0; i < ballSolver.GetBallCount(); i++) {
            const radius = ballSolver.GetBallRadius(i);
            const position = ballSolver.GetBallPosition(i);

            const geometry = new THREE.CircleGeometry(radius, 16);
            // Remove the center vertex.
            geometry.vertices.shift();

            const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const circle = new THREE.LineLoop(geometry, material);

            circle.position.set(position.x, position.y, 0);

            this._ballMeshes.push(circle);
            this._scene.add(circle);
        }
    }

    /**
     * Update the scene to match the current wave solver and render.
     */
    Render() : void {
        this._Update();
        this._renderer.render(this._scene, this._camera);
    }

    GetDomElement() : HTMLElement {
        return this._renderer.domElement;
    }

    private _Update() : void {
        for (let i = 0; i < this._ballSolver.GetBallCount(); i++) {
            const position = this._ballSolver.GetBallPosition(i);

            this._ballMeshes[i].position.set(position.x, position.y, 0);
        }
    }
}