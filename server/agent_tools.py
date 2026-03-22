import sympy
from langchain_core.tools import tool


@tool("factor_expression")
def factor_expression(expression: str) -> str:
    """Factor algebraic expression (普通因式分解).

    Use when user asks: factor, 因式分解, 分解因式.
    Args:
    - expression: algebraic expression string, supports ^ and **.
    Returns:
    - factored expression string.
    Example: factor_expression("x^2-1") -> (x - 1)*(x + 1)
    """
    normalized_expression = expression.replace("^", "**")
    try:
        parsed = sympy.sympify(normalized_expression)
        factored = sympy.factor(parsed)
        return str(factored)
    except Exception as error:
        return f"因式分解失败: {error}"


@tool("differentiate_expression")
def differentiate_expression(
    expression: str,
    variable: str = "x",
    order: int = 1,
    point: str | None = None,
) -> str:
    """Differentiate expression (求导), optional derivative value at a point.

    Use when user asks: derivative, differentiate, 求导, 导数, 某点导数.
    Args:
    - expression: expression string, supports ^ and **.
    - variable: differentiation variable, default x.
    - order: derivative order, default 1.
    - point: optional evaluation point (e.g. "2", "pi"). If provided, returns derivative value at point.
    Returns:
    - derivative expression string, or derivative value string when point is provided.
    Examples:
    - differentiate_expression("x^3+2*x") -> 3*x**2 + 2
    - differentiate_expression("x^3+2*x", point="2") -> 14
    """
    normalized_expression = expression.replace("^", "**")
    try:
        var = sympy.Symbol(variable)
        parsed = sympy.sympify(normalized_expression)
        derived = sympy.diff(parsed, var, order)
        if point is not None and str(point).strip() != "":
            point_value = sympy.sympify(str(point).replace("^", "**"))
            return str(sympy.simplify(derived.subs(var, point_value)))
        return str(derived)
    except Exception as error:
        return f"求导失败: {error}"


@tool("simplify_expression")
def simplify_expression(expression: str) -> str:
    """Simplify expression (化简表达式).

    Use when user asks: simplify, 化简, 最简式.
    Args:
    - expression: expression string, supports ^ and **.
    Returns:
    - simplified expression string.
    Example: simplify_expression("(x^2-1)/(x-1)") -> x + 1
    """
    normalized_expression = expression.replace("^", "**")
    try:
        parsed = sympy.sympify(normalized_expression)
        simplified = sympy.simplify(parsed)
        return str(simplified)
    except Exception as error:
        return f"化简失败: {error}"


@tool("expand_expression")
def expand_expression(expression: str) -> str:
    """Expand expression (展开表达式).

    Use when user asks: expand, 展开, 乘法展开.
    Args:
    - expression: expression string, supports ^ and **.
    Returns:
    - expanded expression string.
    Example: expand_expression("(x+1)^3") -> x**3 + 3*x**2 + 3*x + 1
    """
    normalized_expression = expression.replace("^", "**")
    try:
        parsed = sympy.sympify(normalized_expression)
        expanded = sympy.expand(parsed)
        return str(expanded)
    except Exception as error:
        return f"展开失败: {error}"


@tool("solve_equation")
def solve_equation(equation: str, variable: str = "x") -> str:
    """Solve equation (解方程).

    Use when user asks: solve equation, 求方程解, 求根.
    Args:
    - equation: equation string, supports ^ and **. If no '=', assume equation = 0.
    - variable: solving variable, default x.
    Returns:
    - solution list string.
    Examples:
    - solve_equation("x^2-5*x+6=0") -> [2, 3]
    - solve_equation("2*x+3") -> [-3/2]
    """
    normalized_equation = equation.replace("^", "**")
    try:
        var = sympy.Symbol(variable)
        if "=" in normalized_equation:
            left, right = normalized_equation.split("=", maxsplit=1)
            eq = sympy.Eq(sympy.sympify(left), sympy.sympify(right))
            solutions = sympy.solve(eq, var)
        else:
            expr = sympy.sympify(normalized_equation)
            solutions = sympy.solve(sympy.Eq(expr, 0), var)
        return str(solutions)
    except Exception as error:
        return f"解方程失败: {error}"


@tool("limit_expression")
def limit_expression(
    expression: str,
    variable: str = "x",
    point: str = "0",
    direction: str = "both",
) -> str:
    """Compute limit (求极限).

    Use when user asks: limit, 极限, 左极限, 右极限.
    Args:
    - expression: expression string, supports ^ and **.
    - variable: limit variable, default x.
    - point: approaching point, default "0" (supports pi, oo, etc.).
    - direction: both | left | right.
    Returns:
    - limit value string.
    Examples:
    - limit_expression("sin(x)/x", point="0") -> 1
    - limit_expression("1/x", point="0", direction="right") -> oo
    """
    normalized_expression = expression.replace("^", "**")
    try:
        var = sympy.Symbol(variable)
        parsed = sympy.sympify(normalized_expression)
        at_point = sympy.sympify(point.replace("^", "**"))

        dir_map = {
            "both": "+-",
            "left": "-",
            "right": "+",
        }
        limit_dir = dir_map.get(direction.lower(), "+-")
        value = sympy.limit(parsed, var, at_point, dir=limit_dir)
        return str(value)
    except Exception as error:
        return f"求极限失败: {error}"


MATH_TOOLS = [
    factor_expression,
    differentiate_expression,
    simplify_expression,
    expand_expression,
    solve_equation,
    limit_expression,
]
