import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import styles from "./styles.module.css";

const Card = React.forwardRef(
  (
    {
      className,
      variant,
      padding,
      interactive,
      children,
      ...props
    },
    ref,
  ) => {
    const cardClass = classNames(
      styles.card,
      styles[`variant-${variant}`],
      styles[`padding-${padding}`],
      interactive && styles.interactive,
      className,
    );

    return (
      <div ref={ref} className={cardClass} {...props}>
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

Card.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(["default", "soft", "elevated", "outline"]),
  padding: PropTypes.oneOf(["none", "compact", "default", "spacious"]),
  interactive: PropTypes.bool,
  children: PropTypes.node,
};

Card.defaultProps = {
  className: "",
  variant: "default",
  padding: "default",
  interactive: false,
};

export { Card };
