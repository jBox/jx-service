exports.validateMobileNumber = (mobile) => {
    return /^1\d{10}$/g.test("" + mobile);
};

exports.isUsernameValid = (username) => {
    return username && /^[a-zA-z][\w-]{4,}$/ig.test(username);
};

exports.isPasswordValid = (password) => {
    return password && password.length >= 6;
};