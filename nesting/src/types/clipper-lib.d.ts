/**
 * clipper-lib 6.4.2 için kullandığımız alt kümenin tip tanımı.
 * (@types/clipper-lib eklemek yerine: yalnızca gereken API, bağımlılık yok.)
 */
declare module 'clipper-lib' {
  namespace ClipperLib {
    interface IntPoint {
      X: number;
      Y: number;
    }
    type Path = IntPoint[];
    type Paths = Path[];

    enum ClipType {
      ctIntersection = 0,
      ctUnion = 1,
      ctDifference = 2,
      ctXor = 3,
    }
    enum PolyType {
      ptSubject = 0,
      ptClip = 1,
    }
    enum PolyFillType {
      pftEvenOdd = 0,
      pftNonZero = 1,
      pftPositive = 2,
      pftNegative = 3,
    }
    enum JoinType {
      jtSquare = 0,
      jtRound = 1,
      jtMiter = 2,
    }
    enum EndType {
      etOpenSquare = 0,
      etOpenRound = 1,
      etOpenButt = 2,
      etClosedLine = 3,
      etClosedPolygon = 4,
    }

    class Clipper {
      constructor(initOptions?: number);
      AddPath(path: Path, polyType: PolyType, closed: boolean): boolean;
      AddPaths(paths: Paths, polyType: PolyType, closed: boolean): boolean;
      Execute(clipType: ClipType, solution: Paths, subjFillType?: PolyFillType, clipFillType?: PolyFillType): boolean;
      static Area(poly: Path): number;
      static Orientation(poly: Path): boolean;
      static SimplifyPolygons(polys: Paths, fillType?: PolyFillType): Paths;
      static CleanPolygons(polys: Paths, distance?: number): Paths;
      static MinkowskiSum(pattern: Path, path: Path | Paths, pathIsClosed: boolean): Paths;
    }

    class ClipperOffset {
      constructor(miterLimit?: number, arcTolerance?: number);
      AddPath(path: Path, joinType: JoinType, endType: EndType): void;
      AddPaths(paths: Paths, joinType: JoinType, endType: EndType): void;
      Execute(solution: Paths, delta: number): void;
      Clear(): void;
    }
  }
  export default ClipperLib;
}
