export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.inner.map((err) => ({ path: err.path, message: err.message })),
    });
  }
};