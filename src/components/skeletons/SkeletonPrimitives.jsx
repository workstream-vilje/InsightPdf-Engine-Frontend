import classNames from "classnames";

import styles from "./SkeletonPrimitives.module.css";

export function SkeletonLine({ className, style }) {
  return <span className={classNames(styles.shimmer, styles.line, className)} style={style} />;
}

export function SkeletonBlock({ className, style }) {
  return <span className={classNames(styles.shimmer, styles.block, className)} style={style} />;
}

export function SkeletonCircle({ className, style }) {
  return <span className={classNames(styles.shimmer, styles.circle, className)} style={style} />;
}
