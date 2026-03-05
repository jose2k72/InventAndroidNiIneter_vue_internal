package com.cadicsa.inventario.security

data class DeviceUser(
    val userName: String,
    val fullName: String,
    val initials: String,
    var passwordHash: String,
    var salt: String
)
