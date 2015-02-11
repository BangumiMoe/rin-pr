Controller: User
===================

* `/user/check`
  - desc: Check user email & username exists, and password validation.
  - method: `POST`
  - params: `{ email: user.email, username: user.username, password: md5(real password) }`
  - return: `{ valid: <true|false>, exists: <true|false> }`

* `/user/register`
  - desc: User register
  - method: `POST`
  - params: `{ email: user.email, username: user.username, password: md5(real password) }`
  - return: `{ success: <true|false>, message: '<error message>', user: [object user] }`

* `/user/update`
  - desc: Update user information (self only).
  - method: `POST`
  - params: `{ receive_email: <true|false>, password: md5(real password), new_password: md5(real new password) }`
  - return: `{ success: <true|false> }`

* `/user/signin`
  - desc: User sign in
  - method: `POST`
  - params: `{ username: <user.username|user.email>, password: md5(password) }`
  - return: `{ success: <true|false>, message: '<error message>' }`

* `/user/signout`
  - desc: User sign out
  - method: `DELETE`
  - params: none
  - return: `{ success: true }`

* `/user/session`
  - desc: Get current user information.
  - method: `GET`
  - params: none
  - return: [object user]

* `/user/sso/disqus`
  - desc: Get disqus sso settings.
  - method: `GET`
  - params: none
  - return: `{ api_key: <disqus public_key>, remote_auth_s3: <disqus remote_auth_s3> }`

* `/user/fetch`
  - desc: Fetch user(s) information.
  - method: `POST`
  - params: `{ _id: user._id }` or `{ _ids: [user._id] }`
  - return: [object user] or [ [object user] ]

* `/user/activate/:key`
  - desc: User activate action.
  - method: `GET`
  - params: none
  - return: succeed: HTTP Status = 302, failed: HTTP Status = 400 ?

* `/user/reset-password/request`
  - desc: User request password reset.
  - method: `POST`
  - params: `{ username: user.username, email: user.email }`
  - return: `{ success: <true|false>, message: '<error message>' }` or HTTP Status = 403

* `/user/reset-password`
  - desc: User reset password.
  - method: `POST`
  - params: `{ resetKey: <user password reset key>, password: md5(new password) }`
  - return: `{ success: <true|false> }`

* `/user/subscribe/collections`
  - desc: Get current user subscribed collections.
  - method: `GET`
  - params: none
  - return: [ [tag._id] ]

* `/user/subscribe/update`
  - desc: Update current user subscribed collections.
  - method: `POST`
  - params: [ [tag._id] ]
  - return: `{ success: <true|false> }`
