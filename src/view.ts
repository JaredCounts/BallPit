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

    // private _bucketToMat : THREE.MeshBasicMaterial[][];


    constructor(parentElement: HTMLElement, ballSolver: BallSolver) {
        this._ballSolver = ballSolver;

        this._scene = new THREE.Scene();
        this._renderer = new THREE.WebGLRenderer();
        this._renderer.setSize(
            parentElement.offsetWidth, parentElement.offsetHeight);

        // The screen goes from [-1,1] along x and y axes.
        this._camera = new THREE.OrthographicCamera(
            /* left */ -1,
            /* right */ 1,
            /* top */ -1,
            /* bottom */ 1,
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
            geometry.vertices.shift();

            const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        

            // Since our scene view is flipped, we need to set this side to 
            // double, otherwise our circles will be invisible.
            material.side = THREE.DoubleSide;

            const circle = new THREE.LineLoop(geometry, material);
            this._ballMeshes.push(circle);

            // circle.position.set(0.5,0,0);
            // console.log(position);
            circle.position.set(position.x, position.y, 0);

            this._scene.add(circle);
        }


        // this._bucketToMat = [];
        
        // for (let x = 0; x < this._ballSolver._partition._buckets.length; x++) {
        //     this._bucketToMat[x] = [];
        //     for (let y = 0; y < this._ballSolver._partition._buckets[x].length; y++) {
                
        //         let geometry = new THREE.PlaneGeometry(
        //             this._ballSolver._partition._cellSize, 
        //             this._ballSolver._partition._cellSize);
        //         let material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
        //         let plane = new THREE.Mesh( geometry, material );
        //         plane.position.set(
        //             (x+0.5) * this._ballSolver._partition._cellSize - 1,
        //             (y+0.5) * this._ballSolver._partition._cellSize - 1,
        //             -1);
        //         this._scene.add( plane );

        //         this._bucketToMat[x][y] = material;
        //         // console.log([x,y]);
        //         // console.log(material;
        //         // console.log(this._bucketToMat.get([x,y]));
        //     }
        // }


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

            // console.log(i, position);

            this._ballMeshes[i].position.set(position.x, position.y, 0);
        }


        // for (let x = 0; x < this._ballSolver._partition._buckets.length; x++) {
        //     for (let y = 0; y < this._ballSolver._partition._buckets[x].length; y++) {
        //         const bucket = this._ballSolver._partition._buckets[x][y];
        //         const mat = this._bucketToMat[x][y];
        //         // console.log(mat);

        //         // console.log([x,y]);

        //         if (bucket.length == 0) {
        //             mat.color.setHex(0x880000);
        //         }
        //         else {
        //             mat.color.setHex(0x008800);
        //         }
        //     }
        // }
    }
}