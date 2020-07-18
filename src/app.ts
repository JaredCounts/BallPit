import { View } from './view'
import { Controller } from './controller'
import { TimeManager } from './timeManager'

// Defer setting up the view. We do this because we expect a dom element with 
// the "app" ID, but it won't exist since js in the header gets loaded before
// the dom elements.
let view;
function ResetView() : void {
    const appElement = document.getElementById('app');

    // When updating the view, we need to be sure to replace the old dom element 
    // instead of just adding a new one.
    const oldDomElement = view == null ? null : view.GetDomElement();
    view = new View(appElement);

    if (oldDomElement == null) {
        appElement.appendChild(view.GetDomElement());
    }
    else {
        appElement.replaceChild(view.GetDomElement(), oldDomElement);
    }
}

// Defer setting up the controller for the same reason as the view.
let controller;
function ResetController() : void {
    let appElement = document.getElementById('app');
    controller = new Controller(window, appElement);
}

const timestepManager = new TimeManager(
    /* timestep_ms */ 10.0,
    /* timestepLimitPerUpdate */ 10);

/**
 * The main update loop of the app.
 */
function Animate() : void {
    requestAnimationFrame(Animate);

    // timestepManager.Update(
    //     waveSolver.Solve.bind(waveSolver));

    if (view != null) {
        view.Render();
    }
}

// When the dom content loads, instantiate the view and controller
function OnDOMContentLoaded(event) : void {
    ResetView();
    ResetController();
}
document.addEventListener('DOMContentLoaded', OnDOMContentLoaded);

// When window resizes, reset everything.
function OnWindowResize() {
    ResetView();
    ResetController();
}
window.addEventListener('resize', OnWindowResize);

Animate();
