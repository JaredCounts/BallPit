import { Vector2 } from 'three'
import { TouchPos } from './touchPos'
import { BallSolver } from './ballSolver'

import { MathUtils } from 'three';

/**
 * Handle user interactions.
 */
export class Controller {
    // Keep a map of touch identifiers to "TouchPos"es. We need this just so we 
    // can keep track of the "previous" positions of each touch.
    private readonly _identifierToTouchPos: Map<any, TouchPos>;

    private _mousePos : Vector2;
    private _prevMousePos : Vector2;
    private _mouseDown : boolean;
    
    private readonly _parentElement : HTMLElement;

    private readonly _ballSolver : BallSolver;

    constructor(window, parentElement, ballSolver) {
        this._identifierToTouchPos = new Map<any, TouchPos>();

        this._mousePos = new Vector2();
        this._prevMousePos = new Vector2();
        this._mouseDown = false;

        this._parentElement = parentElement;

        this._ballSolver = ballSolver;

        this._RegisterForEvents()
    }

    HandleTouchStart(event) : void {
        // XXX we should probably update _identifierToTouchPos here
    }

    HandleTouchMove(event) : void {
        event.preventDefault();
        
        // Update our mappings and their positions given the event positions.
        for (const touch of event.touches) {
            const screenPosition = this._PageToScreen(touch.pageX, touch.pageY);

            if (this._identifierToTouchPos.has(touch.identifier)) {
                this._identifierToTouchPos.get(touch.identifier).SetPos(
                    screenPosition.x, screenPosition.y);
            }
            else {
                this._identifierToTouchPos.set(
                    touch.identifier, 
                    new TouchPos(screenPosition.x, screenPosition.y));
            }
        }
    }

    HandleTouchEnd(event) : void {
        // On touch end events, remove any identifier from the _identifierToTouchPos 
        // map so it doesn't grow indefinitely.
        // This is kind of a roundabout way of doing it. First we create a set,
        // populate it with every touch identifier we know about, then remove 
        // from that every identifier that's still around, and then we remove 
        // whatever is remaining from the map.

        const identifiersToRemove = new Set();

        // Populate identifiersToRemove with all the touches we have first
        for (const identifier of this._identifierToTouchPos.keys()) {
            identifiersToRemove.add(identifier);
        }

        // Remove any identifiers from the list that are still around
        for (const touch of event.touches) {
            identifiersToRemove.delete(touch.identifier);
        }

        // Now remove the remaining touches from the master map
        for (const identifier of identifiersToRemove.keys()) {
            if (this._identifierToTouchPos.has(identifier)) {
                this._identifierToTouchPos.delete(identifier);
            }
        }
    }

    HandleMouseDown(event) : void {
        this._mouseDown = true;
        this._UpdateMousePos(this._PageToScreen(event.pageX, event.pageY));
    }

    HandleMouseUp(event) : void {
        this._mouseDown = false;
        this._UpdateMousePos(this._PageToScreen(event.pageX, event.pageY));
    }

    HandleMouseMove(event) : void {
        this._UpdateMousePos(this._PageToScreen(event.pageX, event.pageY));

        if (this._mouseDown) {
            this._Drag(this._prevMousePos, this._mousePos);
        }
    }

    HandleMouseClick(event) : void {
        this._UpdateMousePos(this._PageToScreen(event.pageX, event.pageY));
    }

    private _DistanceToSegment(
        segmentStart : Vector2,
        segmentEnd : Vector2,
        position : Vector2) : number 
    {
        const startToEnd = new Vector2();
        startToEnd.subVectors(segmentEnd, segmentStart);

        const posRelativeToStart = new Vector2();
        posRelativeToStart.subVectors(position, segmentStart);

        const projectedDistAlongStartToEnd = posRelativeToStart.dot(startToEnd);

        // If the dot product < 0, then the position is past the segment start
        if (projectedDistAlongStartToEnd < 0) {
            return position.distanceTo(segmentStart);
        }
        // On the other hand, if it's longer than the vector from start to end
        // of the segment, then it's past the end.
        else if (
            projectedDistAlongStartToEnd * projectedDistAlongStartToEnd 
            > startToEnd.lengthSq())
        {
            return position.distanceTo(segmentEnd);
        }
        // Otherwise, we want the distance to the line.
        else {
            // segmentStart + (posRelativeToStart dot startToEnd) * startToEnd
            const projectedToLine = new Vector2();
            projectedToLine
                .copy(startToEnd)
                .multiplyScalar(projectedDistAlongStartToEnd)
                .add(segmentStart);

            return projectedToLine.distanceTo(position);
        }
    }

    private _Drag(fromPosition : Vector2, toPosition : Vector2) : void {
        const force = 10;


        const velToAdd = new Vector2();
        velToAdd.subVectors(toPosition, fromPosition);
        velToAdd.multiplyScalar(force);

        for (let i = 0; i < this._ballSolver.GetBallCount(); i++) {
            let ballPosition = this._ballSolver.GetBallPosition(i);

            if (this._DistanceToSegment(fromPosition, toPosition, ballPosition) < 0.2) {
                this._ballSolver.AddVelocityToBall(i, velToAdd);
            }
        }
    } 

    /**
     * This adds the controller's handlers to their respective events in the
     * parent element.
     */
    private _RegisterForEvents() : void {
        type Binding = [string, EventListenerOrEventListenerObject]
        let bindings : Binding[];
        bindings = [
            ['touchmove', this.HandleTouchMove.bind(this)],
            ['touchstart', this.HandleTouchStart.bind(this)],
            ['touchend', this.HandleTouchEnd.bind(this)],
            ['touchleave', this.HandleTouchEnd.bind(this)],
            ['mousemove', this.HandleMouseMove.bind(this)],
            ['mousedown', this.HandleMouseDown.bind(this)],
            ['mouseup', this.HandleMouseUp.bind(this)],
            ['mouseleave', this.HandleMouseUp.bind(this)],
            ['click', this.HandleMouseClick.bind(this)]
        ];

        for (const binding of bindings) {
            this._parentElement.addEventListener(...binding);
        }
    }

    private _UpdateMousePos(pos : Vector2) : void {
        this._prevMousePos.copy(this._mousePos);
        this._mousePos = pos;
    }

    /** 
     * Convert coordinates from page space to screen space.
     */
    private _PageToScreen(pageX, pageY) : Vector2 {
        const elementX = pageX - this._parentElement.offsetLeft;
        const elementY = pageY - this._parentElement.offsetTop;

        const aspect = 
            this._parentElement.offsetWidth / this._parentElement.offsetHeight;

        return new Vector2(
            MathUtils.mapLinear(
                elementX, 
                0, this._parentElement.offsetWidth,
                -1, 1),
            MathUtils.mapLinear(
                elementY, 
                0, this._parentElement.offsetHeight,
                -1.0/aspect, 1.0/aspect));
    }
}