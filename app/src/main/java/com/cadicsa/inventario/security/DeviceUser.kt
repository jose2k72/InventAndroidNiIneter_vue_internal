package com.cadicsa.inventario.security

data class DeviceUser(
    var userName: String,
    var fullName: String,
    var initials: String,
    var passwordHash: String,
    var salt: String
)
