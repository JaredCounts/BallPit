type bresenhamCallbackType = (x: number, y: number) => void;

/**
 * Run bresenham's line algorithm from the start position to the end position,
 * and perform the given callback function on each integer point between those
 * two positions. 
 * Based on http://en.wikipedia.org/wiki/Bresenham's_line_algorithm
 */
export function Bresenham(
    startX : number, startY : number, 
    endX : number, endY : number,
    callback : bresenhamCallbackType) : void 
{
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);

    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    
    let err = dx - dy;
    let x = startX;
    let y = startY;

    while (x != endX || y != endY) {
        callback(x, y);

        let e2 = 2 * err;
        
        if (e2 > -dy) {
          err -= dy;
          x = x + sx;
        }

        if (e2 < dx) {
          err = err + dx;
          y = y + sy;
        }
    }
}