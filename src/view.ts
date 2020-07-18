import * as THREE from 'three';

/**
 * The "view" of our application. Given the wave solver, this will render to
 * match the wave solver's current state.
 */
export class View {
    private readonly _scene : THREE.Scene;
    private readonly _renderer : THREE.WebGLRenderer;
    private readonly _camera : THREE.Camera;

    private readonly _material : THREE.MeshBasicMaterial;
    private readonly _textureWidth : number;
    private readonly _textureHeight : number;
    
    // Pixel data for the on screen texture.
    private _textureData : Uint8Array;

    constructor(parentElement) {
        this._scene = new THREE.Scene();
        this._renderer = new THREE.WebGLRenderer();
        this._renderer.setSize(
            parentElement.offsetWidth, parentElement.offsetHeight);

        // I somewhat arbitrarily chose a screen that goes [-1,1] along each
        // axis.
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
        this._camera.position.z = 100;
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
    }
}