package com.cadicsa.inventario

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.cadicsa.inventario.security.DeviceUser
import java.util.Random

class UserAdapter(
    private var users: List<DeviceUser>,
    private val onEditClick: (DeviceUser) -> Unit,
    private val onPasswordClick: (DeviceUser) -> Unit,
    private val onDeleteClick: (DeviceUser) -> Unit
) : RecyclerView.Adapter<UserAdapter.UserViewHolder>() {

    fun updateUsers(newUsers: List<DeviceUser>) {
        users = newUsers
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_user, parent, false)
        return UserViewHolder(view)
    }

    override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
        val user = users[position]
        holder.bind(user, onEditClick, onPasswordClick, onDeleteClick)
    }

    override fun getItemCount(): Int = users.size

    class UserViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvInitials: TextView = itemView.findViewById(R.id.tvInitials)
        private val tvFullName: TextView = itemView.findViewById(R.id.tvFullName)
        private val tvUserName: TextView = itemView.findViewById(R.id.tvUserName)
        private val btnPassword: ImageButton = itemView.findViewById(R.id.btnPassword)
        private val btnEdit: ImageButton = itemView.findViewById(R.id.btnEdit)
        private val btnDelete: ImageButton = itemView.findViewById(R.id.btnDelete)

        fun bind(
            user: DeviceUser,
            onEditClick: (DeviceUser) -> Unit,
            onPasswordClick: (DeviceUser) -> Unit,
            onDeleteClick: (DeviceUser) -> Unit
        ) {
            tvFullName.text = user.fullName
            tvUserName.text = if (user.userName == "ADMIN") "${user.userName} • Administrador" else "${user.userName} • Usuario Normal"
            tvInitials.text = user.initials
            
            // Generate a random stable background color based on username hash
            val bg = GradientDrawable()
            bg.shape = GradientDrawable.OVAL
            val random = Random(user.userName.hashCode().toLong())
            val color = Color.argb(255, random.nextInt(200), random.nextInt(200), random.nextInt(200))
            bg.setColor(color)
            tvInitials.background = bg

            // Rules: ADMIN cannot be edited or deleted
            if (user.userName == "ADMIN") {
                btnEdit.visibility = View.GONE
                btnDelete.visibility = View.GONE
            } else {
                btnEdit.visibility = View.VISIBLE
                btnDelete.visibility = View.VISIBLE
            }

            btnEdit.setOnClickListener { onEditClick(user) }
            btnDelete.setOnClickListener { onDeleteClick(user) }
            btnPassword.setOnClickListener { onPasswordClick(user) }
        }
    }
}
